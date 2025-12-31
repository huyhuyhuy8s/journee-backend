import type {IUser} from '@/types';
import type {Request, Response} from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {adminDb} from '@/config/firebase';
import _ from 'lodash';
import {config} from '@/config/env';
import {fetchDocuments, validateRequiredFields} from '@/utils/firestore.helper';
import {ERole} from '@/constants';
import {blacklistCreation, cleanUpUserSettings, generateToken, settingCreation} from '@/controllers/user/functions';
import {blacklistToken, cleanupExpiredTokens} from '@/services/jwt.service';

export const createUser = async (req: Request, res: Response) => {
  try {
    const {name, email, password, avatar} = req.body;

    if (!validateRequiredFields(req.body, ['name', 'email', 'password'], res))
      return;

    const allUsersSnap = await fetchDocuments<IUser>('users', res, 'Users');
    if (!allUsersSnap.success || !allUsersSnap.data) return;

    if (allUsersSnap.data.some((u) => u.email === email)) {
      return res.apiError({
        status: 409,
        message: 'User with this email already exists',
        error: 'Conflict',
      });
    }

    const saltRounds = config.BCRYPT_SALT_ROUNDS;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser: Partial<IUser> = {
      name,
      email,
      password: hashedPassword,
      avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name,
      )}&background=random`,
      roleId: ERole.USER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: new Date(),
    };

    const ref = await adminDb.collection('users').add(newUser);

    await settingCreation(ref.id);
    await blacklistCreation(ref.id);

    return res.apiResponse(
      {
        status: 201,
        message: 'User created successfully',
      },
      {
        id: ref.id,
        email: newUser.email,
        name: newUser.name,
        avatar: newUser.avatar,
      },
    );
  } catch (err) {
    console.error('createUser err:', err);
    return res.apiError({
      status: 500,
      message: 'Internal server error',
      error: 'Server Error',
    });
  }
};

export const getAllUsers = async (_: Request, res: Response) => {
  const allUsersSnap = await fetchDocuments<IUser>('users', res, 'Users');
  if (!allUsersSnap.success || !allUsersSnap.data) return;

  const allUsers: IUser[] = allUsersSnap.data.map(
    (user) =>
      ({
        id: user.id,
        avatar: user.avatar,
        email: user.email,
        name: user.name,
      } as IUser),
  );

  return res.apiResponse(
    {
      status: 200,
      message: 'Users retrieved successfully',
    },
    {
      users: allUsers,
    },
  );
};

export const getUserById = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const usersSnap = await fetchDocuments<IUser>('users', res, 'User');
  if (!usersSnap.success || !usersSnap.data) return;

  const userDoc = usersSnap.data.find((u) => u.id === userId);
  if (!userDoc) {
    return res.apiError({
      status: 404,
      message: 'User not found',
      error: 'Not Found',
    });
  }

  const userResponse = {
    id: userDoc.id,
    avatar: userDoc.avatar,
    email: userDoc.email,
    name: userDoc.name,
  };

  return res.apiResponse(
    {
      status: 200,
      message: 'User retrieved successfully',
    },
    userResponse,
  );
};

export const getCurrentUser = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.apiError({
      status: 401,
      message: 'Unauthorized',
      error: 'Authentication Error',
    });
  }

  const userId = user.id;

  const usersSnapDoc = await fetchDocuments<IUser>('users', res, 'User');
  if (!usersSnapDoc.success || !usersSnapDoc.data) return;

  const userDoc = usersSnapDoc.data.find((u) => u.id === userId);
  if (!userDoc) {
    return res.apiError({
      status: 404,
      message: 'User not found',
      error: 'Not Found',
    });
  }

  const userResponse = {
    id: userDoc.id,
    avatar: userDoc.avatar,
    email: userDoc.email,
    name: userDoc.name,
  };

  return res.apiResponse(
    {
      status: 200,
      message: 'User retrieved successfully',
    },
    userResponse,
  );
};

export const updateUser = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const {name, email, avatar}: Partial<IUser> = req.body;

  const userDocRef = adminDb.collection('users').doc(userId);
  const userDoc = await userDocRef.get();

  const userData = userDoc.data();
  if (!userDoc.exists || _.isUndefined(userData)) {
    return res.apiError({
      status: 404,
      message: 'User not found',
      error: 'Not Found',
    });
  }

  const updatedUser: Partial<IUser> = {
    ...userData,
    name: name || userData.name,
    email: email || userData.email,
    avatar: avatar || userData.avatar,
    updatedAt: new Date(),
  };

  await userDocRef.update(updatedUser);

  return res.apiResponse({
    status: 200,
    message: 'User updated successfully',
  });
};

export const deleteUser = async (req: Request, res: Response) => {
  const userId = req.params.id;

  const userDocRef = adminDb.collection('users').doc(userId);
  const userDoc = await userDocRef.get();

  if (!userDoc.exists) {
    return res.apiError({
      status: 404,
      message: 'User not found',
      error: 'Not Found',
    });
  }

  await userDocRef.delete();

  await cleanUpUserSettings(userId);

  return res.apiResponse({
    status: 200,
    message: 'User deleted successfully',
  });
};

export const login = async (req: Request, res: Response) => {
  try {
    const {email, password} = req.body;
    if (!email || !password) {
      return res.apiError({
        status: 400,
        message: 'Email and password are required',
        error: 'Bad Request',
      });
    }

    const userSnap = await adminDb
      .collection('users')
      .where('email', '==', email)
      .get();
    const userDoc = userSnap.docs[0];

    if (!userDoc) {
      return res.apiError({
        status: 401,
        message: 'There is no user with this email',
        error: 'Unauthorized',
      });
    }

    const userResponse: IUser = {
      id: userDoc.id,
      email: userDoc.data().email,
      name: userDoc.data().name,
      password: userDoc.data().password,
      avatar: userDoc.data().avatar,
      roleId: userDoc.data().roleId,
      isActive: userDoc.data().isActive || false,
      createdAt: userDoc.data().createdAt,
      updatedAt: userDoc.data().updatedAt,
      lastLogin: userDoc.data().lastLogin,
    };

    const isPasswordValid = await bcrypt.compare(
      password,
      userResponse.password,
    );
    if (!isPasswordValid) {
      return res.apiError({
        status: 401,
        message: 'Invalid password',
        error: 'Unauthorized',
      });
    }

    if (!userResponse.isActive) {
      return res.apiError({
        status: 401,
        message: 'User is inactive',
        error: 'Unauthorized',
      });
    }

    const now = new Date();
    await adminDb.doc(userDoc.ref.path).update({lastLogin: now});

    const token = generateToken(userResponse.id, userResponse.roleId);
    console.info(
      `User ${userResponse.email} logged in at ${now.toISOString()}`,
    );

    return res.apiResponse(
      {
        status: 200,
        message: 'Login successful',
      },
      {
        id: userResponse.id,
        email: userResponse.email,
        name: userResponse.name,
        avatar: userResponse.avatar ? userResponse.avatar : '',
        token,
      },
    );
  } catch (error) {
    console.error('Login error:', error);
    return res.apiError({
      status: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.apiError({
        status: 401,
        message: 'Access token required',
        error: 'Unauthorized',
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload;
    if (!decoded || !decoded.exp) {
      return res.apiError({
        status: 401,
        message: 'Invalid token',
        error: 'Unauthorized',
      });
    }

    if (!req.user) {
      return res.apiError({
        status: 401,
        message: 'User not found',
        error: 'Unauthorized',
      });
    }

    const userId = req.user.id;

    await blacklistToken(token, userId);

    console.info(`User ${userId} logged out at ${new Date().toISOString()}`);
    return res.apiSuccess({
      status: 200,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({error: 'Internal server error'});
  }
};

export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.apiError({
        status: 404,
        message: 'User not found',
        error: 'Not Found',
      });
    }

    const updatedUser: Partial<IUser> = {
      isActive: false,
    };

    await userDocRef.update(updatedUser);
    return res.apiResponse({
      status: 200,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    return res.apiError({
      status: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
  }
};

export const validateToken = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.apiError({
        status: 401,
        message: 'Invalid token',
        error: 'Unauthorized',
      });
    }
    const userId = req.user.id;
    const userDoc = await adminDb.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.apiError({
        status: 404,
        message: 'User not found',
        error: 'Not Found',
      });
    }

    const userData = userDoc.data();
    const userResponse = {
      id: userDoc.id,
      avatar: userData?.avatar,
      email: userData?.email,
      name: userData?.name,
      message: 'Token is valid',
    };
    res.apiResponse(
      {
        status: 200,
        message: 'Token is valid',
      },
      userResponse,
    );
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({error: 'Internal server error'});
  }
};

export const cleanupTokens = async (_: Request, res: Response) => {
  try {
    const cleanedCount = await cleanupExpiredTokens();
    res.apiResponse({
      status: 200,
      message: `Cleaned up ${cleanedCount} expired tokens`,
    });
  } catch (error) {
    console.error('Token cleanup error:', error);
    res.apiError({
      status: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
  }
};
