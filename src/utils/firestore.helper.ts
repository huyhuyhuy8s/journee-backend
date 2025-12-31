import {adminDb} from '@/config/firebase';
import {type DocumentSnapshot, type QuerySnapshot, Timestamp} from 'firebase-admin/firestore';
import type {Response} from 'express';
import _ from 'lodash';

export interface FetchDocumentResult<T> {
  success: boolean;
  data?: T;
  doc?: DocumentSnapshot;
}

export const convertTimestamps = <T = unknown>(data: unknown): T => {
  if (data === null || data === undefined) {
    return data as T;
  }

  if (data instanceof Timestamp) {
    return data.toDate() as T;
  }

  if (_.isArray(data)) {
    return data.map(item => convertTimestamps(item)) as T;
  }

  if (typeof data === 'object' && data.constructor === Object) {
    const converted: Record<string, unknown> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        converted[key] = convertTimestamps((data as Record<string, unknown>)[key]);
      }
    }
    return converted as T;
  }

  return data as T;
};

export const fetchDocument = async <T = unknown>(
  collection: string,
  docId: string,
  res: Response,
  resourceName = 'Document',
): Promise<FetchDocumentResult<T>> => {
  try {
    const doc = await adminDb.collection(collection).doc(docId).get();

    if (!doc.exists) {
      res.apiError({
        status: 404,
        message: `${resourceName} not found`,
        error: 'Not Found',
      });
      return {success: false};
    }

    const rawData = doc.data();
    if (!rawData) {
      res.apiError({
        status: 404,
        message: `${resourceName} data is empty`,
        error: 'Not Found',
      });
      return {success: false};
    }

    const data = convertTimestamps<T>(rawData);

    return {success: true, data, doc};
  } catch (error) {
    res.apiError({
      status: 500,
      message: `Failed to fetch ${resourceName.toLowerCase()}`,
      error: String(error),
    });
    return {success: false};
  }
};

export const fetchDocuments = async <T = unknown>(
  collection: string,
  res: Response,
  resourceName = 'Documents',
): Promise<{ success: boolean; data?: T[]; snapshot?: QuerySnapshot }> => {
  try {
    const snapshot = await adminDb.collection(collection).get();

    if (snapshot.empty) {
      return {success: true, data: [], snapshot};
    }

    const data = snapshot.docs.map((doc) => (
      convertTimestamps<T>({
        id: doc.id,
        ...doc.data(),
      })
    ));

    return {success: true, data, snapshot};
  } catch (error) {
    res.apiError({
      status: 500,
      message: `Failed to fetch ${resourceName.toLowerCase()}`,
      error: String(error),
    });
    return {success: false};
  }
};

export const fetchDocumentWithRelation = async <T = unknown, R = unknown>(
  parentCollection: string,
  parentId: string,
  childCollection: string,
  relationField: string,
  res: Response,
  parentName = 'Document',
  childName = 'Related items',
): Promise<{
  success: boolean;
  parent?: T;
  children?: R[];
  parentDoc?: DocumentSnapshot;
}> => {
  try {
    // Fetch parent document
    const parentResult = await fetchDocument<T>(
      parentCollection,
      parentId,
      res,
      parentName,
    );
    if (!parentResult.success) {
      return {success: false};
    }

    // Fetch related children
    const childSnapshot = await adminDb
      .collection(childCollection)
      .where(relationField, '==', parentId)
      .get();

    const children = childSnapshot.docs.map((doc) => (
      convertTimestamps<R>({
        id: doc.id,
        ...doc.data(),
      })
    ));

    return {
      success: true,
      parent: parentResult.data,
      children,
      parentDoc: parentResult.doc,
    };
  } catch (error) {
    res.apiError({
      status: 500,
      message: `Failed to fetch ${parentName.toLowerCase()} with ${childName.toLowerCase()}`,
      error: String(error),
    });
    return {success: false};
  }
};

export const fetchDocumentsWithRelation = async <T = unknown, R = unknown>(
  parentCollection: string,
  childCollection: string,
  relationField: string,
  res: Response,
  parentName = 'Documents',
  childName = 'Related items',
): Promise<{
  success: boolean;
  parents?: (T & { id: string })[];
  children?: (R & { id: string })[];
  parentsWithChildren?: (T & {
    id: string;
    children: (R & { id: string })[];
  })[];
}> => {
  try {
    // Fetch all parent documents
    const parentSnapshot = await adminDb.collection(parentCollection).get();

    if (parentSnapshot.empty) {
      return {
        success: true,
        parents: [],
        children: [],
        parentsWithChildren: [],
      };
    }

    const parents = parentSnapshot.docs.map((doc) => (
      convertTimestamps<T & { id: string }>({
        id: doc.id,
        ...doc.data(),
      })
    ));

    // Fetch all child documents
    const childSnapshot = await adminDb.collection(childCollection).get();

    const children = childSnapshot.docs.map((doc) => (
      convertTimestamps<R & { id: string }>({
        id: doc.id,
        ...doc.data(),
      })
    ));

    // Map children to their parents
    const parentsWithChildren = parents.map((parent) => ({
      ...parent,
      children: children.filter(
        (child) => (child as Record<string, unknown>)[relationField] === parent.id,
      ),
    }));

    return {
      success: true,
      parents,
      children,
      parentsWithChildren,
    };
  } catch (error) {
    res.apiError({
      status: 500,
      message: `Failed to fetch ${parentName.toLowerCase()} with ${childName.toLowerCase()}`,
      error: String(error),
    });
    return {success: false};
  }
};

export const fetchDocumentsWithQuery = async <T = unknown, R = unknown>(
  parentCollection: string,
  whereConditions: Array<{
    field: string;
    operator: FirebaseFirestore.WhereFilterOp;
    value: unknown;
  }>,
  childCollection?: string,
  relationField?: string,
  res?: Response,
  parentName = 'Documents',
  childName = 'Related items',
): Promise<{
  success: boolean;
  parents?: (T & { id: string })[];
  children?: (R & { id: string })[];
  parentsWithChildren?: (T & {
    id: string;
    children: (R & { id: string })[];
  })[];
}> => {
  try {
    // Build query with where conditions
    let query: FirebaseFirestore.Query = adminDb.collection(parentCollection);

    whereConditions.forEach((condition) => {
      query = query.where(condition.field, condition.operator, condition.value);
    });

    const parentSnapshot = await query.get();

    if (parentSnapshot.empty) {
      return {
        success: true,
        parents: [],
        children: [],
        parentsWithChildren: [],
      };
    }

    const parents = parentSnapshot.docs.map((doc) => (
      convertTimestamps<T & { id: string }>({
        id: doc.id,
        ...doc.data(),
      })
    ));

    // If no child collection specified, return parents only
    if (!childCollection || !relationField) {
      return {success: true, parents};
    }

    // Fetch related children
    const parentIds = parents.map((p) => p.id);

    // Firestore 'in' queries are limited to 10 items, batch if needed
    const batchSize = 10;
    let allChildren: (R & { id: string })[] = [];

    for (let i = 0; i < parentIds.length; i += batchSize) {
      const batch = parentIds.slice(i, i + batchSize);
      const childSnapshot = await adminDb
        .collection(childCollection)
        .where(relationField, 'in', batch)
        .get();

      const batchChildren = childSnapshot.docs.map((doc) => (
        convertTimestamps<R & { id: string }>({
          id: doc.id,
          ...doc.data(),
        })
      ));

      allChildren = [...allChildren, ...batchChildren];
    }

    // Map children to their parents
    const parentsWithChildren = parents.map((parent) => ({
      ...parent,
      children: allChildren.filter(
        (child) => (child as Record<string, unknown>)[relationField] === parent.id,
      ),
    }));

    return {
      success: true,
      parents,
      children: allChildren,
      parentsWithChildren,
    };
  } catch (error) {
    if (res) {
      res.apiError({
        status: 500,
        message: `Failed to fetch ${parentName.toLowerCase()} with ${childName.toLowerCase()}`,
        error: String(error),
      });
    }
    return {success: false};
  }
};

export const validateRequiredFields = (
  body: Record<string, unknown>,
  fields: string[],
  res: Response,
): boolean => {
  if (!body || typeof body !== 'object') {
    console.error('Request body is undefined or invalid:', body);
    res.apiError({
      status: 400,
      message: 'Invalid request body',
      error: 'Request body is required',
    });
    return false;
  }

  const missingFields = fields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    res.apiError({
      status: 400,
      message: 'Validation Error',
      error: `Missing required fields: ${missingFields.join(', ')}`,
    });
    return false;
  }

  return true;
};
