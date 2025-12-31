import {adminDb} from '@/config/firebase';
import type {Request, Response} from 'express';
import {
  fetchDocument,
  fetchDocuments,
  fetchDocumentsWithRelation,
  fetchDocumentWithRelation,
  validateRequiredFields,
} from '@/utils/firestore.helper';
import type {IComment, IPost, IReaction} from '@/types/models';

export const getAllPosts = async (_: Request, res: Response) => {
  try {
    const result = await fetchDocumentsWithRelation<IPost, IComment>(
      'posts',
      'comments',
      'postId',
      res,
      'Posts',
      'Comments',
    );

    if (!result.success || !result.parentsWithChildren) return res.apiError({
      status: 500,
      message: 'Failed to fetch posts with comments',
      error: 'Internal Server Error',
    });

    // Fetch all reactions
    const reactionsResult = await fetchDocuments<IReaction>(
      'reactions',
      res,
      'Reactions',
    );

    if (!reactionsResult.success) return;

    const reactionsData = reactionsResult.data || [];
    const allPosts = result.parentsWithChildren.map((post) => ({
      ...post,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      reactions: reactionsData.filter(
        (reaction) => reaction.postId === post.id,
      ),
      comments: post.children.map((comment) => ({
        ...comment,
        createdAt: comment.createdAt,
      })),
    }));

    return res.apiResponse(
      {message: 'Posts fetched successfully'},
      {posts: allPosts},
    );
  } catch (error) {
    console.error('getAllPosts error:', error);
    return res.apiError({
      status: 500,
      message: 'Failed to fetch posts',
      error: String(error),
    });
  }
};

export const getPostById = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;

    const result = await fetchDocumentWithRelation<IPost, IComment>(
      'posts',
      postId,
      'comments',
      'postId',
      res,
      'Post',
      'Comments',
    );

    if (!result.success) return;

    const reactionsSnapshot = await adminDb
      .collection('reactions')
      .where('postId', '==', postId)
      .get();

    const reactions = reactionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as IReaction[];

    const children = result.children || [];

    const post = {
      id: postId,
      ...result.parent,
      comments: children.map((comment) => ({
        ...comment,
        createdAt: comment.createdAt,
      })),
      reactions,
    };

    return res.apiResponse(
      {message: 'Post retrieved successfully'},
      {post},
    );
  } catch (error) {
    console.error('getPostById error:', error);
    return res.apiError({
      status: 500,
      message: 'Failed to fetch post',
      error: String(error),
    });
  }
};

export const createPost = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const {caption, images, journal} = req.body;

    if (!validateRequiredFields(req.body, ['caption'], res)) return;

    const newPost: Partial<IPost> = {
      userId,
      caption,
      images: images && Array.isArray(images) ? images : [],
      journal: journal && Array.isArray(journal) ? journal : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const postRef = await adminDb.collection('posts').add(newPost);

    return res.apiResponse(
      {message: 'Post created successfully'},
      {
        post: {
          id: postRef.id,
          ...newPost,
          createdAt: newPost.createdAt,
          updatedAt: newPost.updatedAt,
        },
      },
    );
  } catch (error) {
    console.error('createPost error:', error);
    return res.apiError({
      status: 500,
      message: 'Failed to create post',
      error: String(error),
    });
  }
};

export const updatePost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.user?.userId;

    const postResult = await fetchDocument<IPost>(
      'posts',
      postId,
      res,
      'Post',
    );

    if (!postResult.success || !postResult.data) return;

    if (userId !== postResult.data.userId) {
      return res.apiError({
        status: 403,
        message: 'Unauthorized to update this post',
        error: 'Forbidden',
      });
    }

    const {caption, images, journal} = req.body;

    const updatedPost: Partial<IPost> = {
      updatedAt: new Date(),
    };

    if (caption !== undefined) updatedPost.caption = caption;
    if (images && Array.isArray(images)) updatedPost.images = images;
    if (journal && Array.isArray(journal)) updatedPost.journal = journal;

    await adminDb.collection('posts').doc(postId).update(updatedPost);

    return res.apiResponse(
      {message: 'Post updated successfully'},
      {
        post: {
          ...postResult.data,
          ...updatedPost,
          updatedAt: updatedPost.updatedAt,
          id: postId,
        },
      },
    );
  } catch (error) {
    console.error('updatePost error:', error);
    return res.apiError({
      status: 500,
      message: 'Failed to update post',
      error: String(error),
    });
  }
};

export const deletePost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.user?.userId;

    const postResult = await fetchDocument<IPost>(
      'posts',
      postId,
      res,
      'Post',
    );

    if (!postResult.success || !postResult.data) return;

    if (userId !== postResult.data.userId) {
      return res.apiError({
        status: 403,
        message: 'Unauthorized to delete this post',
        error: 'Forbidden',
      });
    }

    const batch = adminDb.batch();

    batch.delete(adminDb.collection('posts').doc(postId));

    const commentsSnapshot = await adminDb
      .collection('comments')
      .where('postId', '==', postId)
      .get();
    commentsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    const reactionsSnapshot = await adminDb
      .collection('reactions')
      .where('postId', '==', postId)
      .get();
    reactionsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();

    return res.apiResponse({message: 'Post deleted successfully'}, null);
  } catch (error) {
    console.error('deletePost error:', error);
    return res.apiError({
      status: 500,
      message: 'Failed to delete post',
      error: String(error),
    });
  }
};

export const reactPost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.user?.userId;
    if (!validateRequiredFields(req.body, ['reactionType'], res)) return;

    const {reactionType} = req.body;

    const postResult = await fetchDocument<IPost>(
      'posts',
      postId,
      res,
      'Post',
    );
    if (!postResult.success) return;

    const existingReaction = await adminDb
      .collection('reactions')
      .where('postId', '==', postId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!existingReaction.empty) {
      const reactionDoc = existingReaction.docs[0];
      await reactionDoc.ref.update({
        reactionType,
        updatedAt: new Date(),
      });

      return res.apiResponse(
        {message: 'Reaction updated successfully'},
        {
          reaction: {
            id: reactionDoc.id,
            reactionType,
          },
        },
      );
    }

    const newReaction: Partial<IReaction> = {
      postId,
      userId,
      reactionType,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const reactionRef = await adminDb
      .collection('reactions')
      .add(newReaction);

    return res.apiResponse(
      {message: 'Reacted to post successfully'},
      {
        reaction: {
          id: reactionRef.id,
          ...newReaction,
          createdAt: newReaction.createdAt,
          updatedAt: newReaction.updatedAt,
        },
      },
    );
  } catch (error) {
    console.error('reactPost error:', error);
    return res.apiError({
      status: 500,
      message: 'Failed to react to post',
      error: String(error),
    });
  }
};

export const updateReaction = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const {reactionType} = req.body;
    const userId = req.user?.userId;
    if (!validateRequiredFields(req.body, ['reactionType'], res)) return;

    const postResult = await fetchDocument<IPost>(
      'posts',
      postId,
      res,
      'Post',
    );

    if (!postResult.success) return;

    const reactionQuery = await adminDb
      .collection('reactions')
      .where('postId', '==', postId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (reactionQuery.empty) {
      return res.apiError({
        status: 404,
        message: 'Reaction not found',
        error: 'Not Found',
      });
    }

    const reactionDoc = reactionQuery.docs[0];
    await reactionDoc.ref.update({
      reactionType,
      updatedAt: new Date(),
    });

    return res.apiResponse(
      {message: 'Reaction updated successfully'},
      {
        reaction: {
          id: reactionDoc.id,
          reactionType,
        },
      },
    );
  } catch (error) {
    console.error('updateReaction error:', error);
    return res.apiError({
      status: 500,
      message: 'Failed to update reaction',
      error: String(error),
    });
  }
};

export const removeReaction = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.user?.userId;

    const postResult = await fetchDocument<IPost>(
      'posts',
      postId,
      res,
      'Post',
    );
    if (!postResult.success) return;

    const reactionQuery = await adminDb
      .collection('reactions')
      .where('postId', '==', postId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (reactionQuery.empty) {
      return res.apiError({
        status: 404,
        message: 'Reaction not found',
        error: 'Not Found',
      });
    }

    await reactionQuery.docs[0].ref.delete();

    return res.apiResponse(
      {message: 'Reaction removed successfully'},
      null,
    );
  } catch (error) {
    console.error('removeReaction error:', error);
    return res.apiError({
      status: 500,
      message: 'Failed to remove reaction',
      error: String(error),
    });
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const {content} = req.body;
    const userId = req.user?.userId;

    if (!validateRequiredFields(req.body, ['content'], res)) return;

    const postResult = await fetchDocument<IPost>(
      'posts',
      postId,
      res,
      'Post',
    );
    if (!postResult.success) return;

    const newComment = {
      postId,
      userId,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const commentRef = await adminDb.collection('comments').add(newComment);

    return res.apiResponse(
      {message: 'Comment added successfully'},
      {
        comment: {
          ...newComment,
          id: commentRef.id,
        },
      },
    );
  } catch (error) {
    console.error('addComment error:', error);
    return res.apiError({
      status: 500,
      message: 'Failed to add comment',
      error: String(error),
    });
  }
};

export const updateComment = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const commentId = req.params.commentId;
    const {content} = req.body;
    const userId = req.user?.userId;

    if (!validateRequiredFields(req.body, ['content'], res)) return;

    const postResult = await fetchDocument<IPost>(
      'posts',
      postId,
      res,
      'Post',
    );

    if (!postResult.success) return;

    const commentResult = await fetchDocument<IComment>(
      'comments',
      commentId,
      res,
      'Comment',
    );

    if (!commentResult.success || !commentResult.data) return;

    if (commentResult.data.postId !== postId) {
      return res.apiError({
        status: 400,
        message: 'Comment does not belong to this post',
        error: 'Bad Request',
      });
    }

    if (commentResult.data.userId !== userId) {
      return res.apiError({
        status: 403,
        message: 'Unauthorized to update this comment',
        error: 'Forbidden',
      });
    }

    const updatedComment = {
      content,
      updatedAt: new Date(),
    };

    await adminDb
      .collection('comments')
      .doc(commentId)
      .update(updatedComment);

    return res.apiResponse(
      {message: 'Comment updated successfully'},
      {
        comment: {
          ...commentResult.data,
          ...updatedComment,
          id: commentId,
        },
      },
    );
  } catch (error) {
    console.error('updateComment error:', error);
    return res.apiError({
      status: 500,
      message: 'Failed to update comment',
      error: String(error),
    });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const commentId = req.params.commentId;
    const userId = req.user?.userId;

    const postResult = await fetchDocument<IPost>(
      'posts',
      postId,
      res,
      'Post',
    );
    if (!postResult.success) return;

    const commentResult = await fetchDocument<IComment>(
      'comments',
      commentId,
      res,
      'Comment',
    );
    if (!commentResult.success || !commentResult.data) return;

    if (commentResult.data.postId !== postId) {
      return res.apiError({
        status: 400,
        message: 'Comment does not belong to this post',
        error: 'Bad Request',
      });
    }

    if (!commentResult.data || !postResult.data) return;

    if (
      commentResult.data.userId !== userId &&
      postResult.data.userId !== userId
    ) {
      return res.apiError({
        status: 403,
        message: 'Unauthorized to delete this comment',
        error: 'Forbidden',
      });
    }

    await adminDb.collection('comments').doc(commentId).delete();

    return res.apiResponse({message: 'Comment deleted successfully'}, null);
  } catch (error) {
    console.error('deleteComment error:', error);
    return res.apiError({
      status: 500,
      message: 'Failed to delete comment',
      error: String(error),
    });
  }
};
