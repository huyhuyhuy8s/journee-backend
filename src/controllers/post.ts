import {adminDb} from "@/config/firebase";
import {IComment, IPost, IReaction} from "@/types/global";
import {Request, Response} from "express";
import {
  fetchDocument,
  fetchDocuments,
  fetchDocumentsWithRelation,
  fetchDocumentWithRelation,
  validateRequiredFields,
} from "@/utils/firestore.helper";
import {Timestamp} from "firebase-admin/firestore";

const postController = {
  getAllPosts: async (req: Request, res: Response) => {
    try {
      const result = await fetchDocumentsWithRelation<IPost, IComment>(
        "posts",
        "comments",
        "postId",
        res,
        "Posts",
        "Comments"
      );

      if (!result.success) return;

      // Fetch all reactions
      const reactionsResult = await fetchDocuments<IReaction>(
        "reactions",
        res,
        "Reactions"
      );

      if (!reactionsResult.success) return;

      // Map posts with their comments and reactions
      const allPosts = result.parentsWithChildren!.map((post) => ({
        ...post,
        createdAt: (post.createdAt as any).toDate(),
        updatedAt: (post.updatedAt as any).toDate(),
        reactions: reactionsResult.data!.filter(
          (reaction) => reaction.postId === post.id
        ),
        comments: post.children.map((comment) => ({
          ...comment,
          createdAt: (comment.createdAt as any).toDate(),
        })),
      }));

      return res.apiResponse(
        {message: "Posts fetched successfully"},
        {posts: allPosts}
      );
    } catch (error) {
      console.error("getAllPosts error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to fetch posts",
        error: String(error),
      });
    }
  },

  getPostById: async (req: Request, res: Response) => {
    try {
      const postId = req.params.id;

      const result = await fetchDocumentWithRelation<IPost, IComment>(
        "posts",
        postId,
        "comments",
        "postId",
        res,
        "Post",
        "Comments"
      );

      if (!result.success) return;

      // Fetch reactions for this post
      const reactionsSnapshot = await adminDb
        .collection("reactions")
        .where("postId", "==", postId)
        .get();

      const reactions = reactionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as IReaction[];

      const post = {
        id: postId,
        ...result.parent,
        createdAt: (result.parent!.createdAt as any).toDate(),
        updatedAt: (result.parent!.updatedAt as any).toDate(),
        comments: result.children!.map((comment) => ({
          ...comment,
          createdAt: (comment.createdAt as any).toDate(),
        })),
        reactions,
      };

      return res.apiResponse(
        {message: "Post retrieved successfully"},
        {post}
      );
    } catch (error) {
      console.error("getPostById error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to fetch post",
        error: String(error),
      });
    }
  },

  createPost: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const {caption, image, journal} = req.body;

      if (!validateRequiredFields(req.body, ["caption"], res)) return;

      const newPost = {
        userId,
        caption,
        image: image && Array.isArray(image) ? image : [],
        journal: journal && Array.isArray(journal) ? journal : [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const postRef = await adminDb.collection("posts").add(newPost);

      return res.apiResponse(
        {message: "Post created successfully"},
        {
          post: {
            id: postRef.id,
            ...newPost,
            createdAt: newPost.createdAt.toDate(),
            updatedAt: newPost.updatedAt.toDate(),
          },
        }
      );
    } catch (error) {
      console.error("createPost error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to create post",
        error: String(error),
      });
    }
  },

  updatePost: async (req: Request, res: Response) => {
    try {
      const postId = req.params.id;
      const userId = req.user?.id;

      const postResult = await fetchDocument<IPost>(
        "posts",
        postId,
        res,
        "Post"
      );
      if (!postResult.success) return;

      // Authorization check
      if (userId !== postResult.data!.userId) {
        return res.apiError({
          status: 403,
          message: "Unauthorized to update this post",
          error: "Forbidden",
        });
      }

      const {caption, images, journal} = req.body;

      const updatedPost: Partial<IPost> = {
        updatedAt: Timestamp.now() as any,
      };

      if (caption !== undefined) updatedPost.caption = caption;
      if (images && Array.isArray(images)) updatedPost.images = images;
      if (journal && Array.isArray(journal)) updatedPost.journal = journal;

      await adminDb.collection("posts").doc(postId).update(updatedPost);

      return res.apiResponse(
        {message: "Post updated successfully"},
        {
          post: {
            id: postId,
            ...postResult.data,
            ...updatedPost,
            updatedAt: (updatedPost.updatedAt as any).toDate(),
          },
        }
      );
    } catch (error) {
      console.error("updatePost error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to update post",
        error: String(error),
      });
    }
  },

  deletePost: async (req: Request, res: Response) => {
    try {
      const postId = req.params.id;
      const userId = req.user?.id;

      const postResult = await fetchDocument<IPost>(
        "posts",
        postId,
        res,
        "Post"
      );
      if (!postResult.success) return;

      // Authorization check
      if (userId !== postResult.data!.userId) {
        return res.apiError({
          status: 403,
          message: "Unauthorized to delete this post",
          error: "Forbidden",
        });
      }

      // Delete post and its related data (cascade delete)
      const batch = adminDb.batch();

      // Delete the post
      batch.delete(adminDb.collection("posts").doc(postId));

      // Delete all comments
      const commentsSnapshot = await adminDb
        .collection("comments")
        .where("postId", "==", postId)
        .get();
      commentsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

      // Delete all reactions
      const reactionsSnapshot = await adminDb
        .collection("reactions")
        .where("postId", "==", postId)
        .get();
      reactionsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

      await batch.commit();

      return res.apiResponse({message: "Post deleted successfully"}, null);
    } catch (error) {
      console.error("deletePost error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to delete post",
        error: String(error),
      });
    }
  },

  reactPost: async (req: Request, res: Response) => {
    try {
      const postId = req.params.id;
      const userId = req.user?.id;
      if (!validateRequiredFields(req.body, ["reactionType"], res)) return;

      const {reactionType} = req.body;

      const postResult = await fetchDocument<IPost>(
        "posts",
        postId,
        res,
        "Post"
      );
      if (!postResult.success) return;

      const existingReaction = await adminDb
        .collection("reactions")
        .where("postId", "==", postId)
        .where("userId", "==", userId)
        .limit(1)
        .get();

      if (!existingReaction.empty) {
        const reactionDoc = existingReaction.docs[0];
        await reactionDoc.ref.update({
          reactionType,
          updatedAt: Timestamp.now(),
        });

        return res.apiResponse(
          {message: "Reaction updated successfully"},
          {
            reaction: {
              id: reactionDoc.id,
              reactionType,
            },
          }
        );
      }

      const newReaction = {
        postId,
        userId,
        reactionType,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const reactionRef = await adminDb
        .collection("reactions")
        .add(newReaction);

      return res.apiResponse(
        {message: "Reacted to post successfully"},
        {
          reaction: {
            id: reactionRef.id,
            ...newReaction,
            createdAt: newReaction.createdAt.toDate(),
            updatedAt: newReaction.updatedAt.toDate(),
          },
        }
      );
    } catch (error) {
      console.error("reactPost error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to react to post",
        error: String(error),
      });
    }
  },

  updateReaction: async (req: Request, res: Response) => {
    try {
      const postId = req.params.id;
      const {reactionType} = req.body;
      const userId = req.user?.id;
      if (!validateRequiredFields(req.body, ["reactionType"], res)) return;

      // Verify post exists
      const postResult = await fetchDocument<IPost>(
        "posts",
        postId,
        res,
        "Post"
      );
      if (!postResult.success) return;

      // Find user's reaction
      const reactionQuery = await adminDb
        .collection("reactions")
        .where("postId", "==", postId)
        .where("userId", "==", userId)
        .limit(1)
        .get();

      if (reactionQuery.empty) {
        return res.apiError({
          status: 404,
          message: "Reaction not found",
          error: "Not Found",
        });
      }

      const reactionDoc = reactionQuery.docs[0];
      await reactionDoc.ref.update({
        reactionType,
        updatedAt: Timestamp.now(),
      });

      return res.apiResponse(
        {message: "Reaction updated successfully"},
        {
          reaction: {
            id: reactionDoc.id,
            reactionType,
          },
        }
      );
    } catch (error) {
      console.error("updateReaction error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to update reaction",
        error: String(error),
      });
    }
  },

  removeReaction: async (req: Request, res: Response) => {
    try {
      const postId = req.params.id;
      const userId = req.user?.id;

      // Verify post exists
      const postResult = await fetchDocument<IPost>(
        "posts",
        postId,
        res,
        "Post"
      );
      if (!postResult.success) return;

      // Find user's reaction
      const reactionQuery = await adminDb
        .collection("reactions")
        .where("postId", "==", postId)
        .where("userId", "==", userId)
        .limit(1)
        .get();

      if (reactionQuery.empty) {
        return res.apiError({
          status: 404,
          message: "Reaction not found",
          error: "Not Found",
        });
      }

      await reactionQuery.docs[0].ref.delete();

      return res.apiResponse(
        {message: "Reaction removed successfully"},
        null
      );
    } catch (error) {
      console.error("removeReaction error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to remove reaction",
        error: String(error),
      });
    }
  },

  addComment: async (req: Request, res: Response) => {
    try {
      const postId = req.params.id;
      const {content} = req.body;
      const userId = req.user?.id;

      if (!validateRequiredFields(req.body, ["content"], res)) return;

      // Verify post exists
      const postResult = await fetchDocument<IPost>(
        "posts",
        postId,
        res,
        "Post"
      );
      if (!postResult.success) return;

      const newComment = {
        postId,
        userId,
        content,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const commentRef = await adminDb.collection("comments").add(newComment);

      return res.apiResponse(
        {message: "Comment added successfully"},
        {
          comment: {
            id: commentRef.id,
            ...newComment,
            createdAt: newComment.createdAt.toDate(),
            updatedAt: newComment.updatedAt.toDate(),
          },
        }
      );
    } catch (error) {
      console.error("addComment error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to add comment",
        error: String(error),
      });
    }
  },

  updateComment: async (req: Request, res: Response) => {
    try {
      const postId = req.params.id;
      const commentId = req.params.commentId;
      const {content} = req.body;
      const userId = req.user?.id;

      if (!validateRequiredFields(req.body, ["content"], res)) return;

      // Verify post exists
      const postResult = await fetchDocument<IPost>(
        "posts",
        postId,
        res,
        "Post"
      );
      if (!postResult.success) return;

      // Verify comment exists
      const commentResult = await fetchDocument<IComment>(
        "comments",
        commentId,
        res,
        "Comment"
      );
      if (!commentResult.success) return;

      // Verify comment belongs to post
      if (commentResult.data!.postId !== postId) {
        return res.apiError({
          status: 400,
          message: "Comment does not belong to this post",
          error: "Bad Request",
        });
      }

      // Authorization check
      if (commentResult.data!.userId !== userId) {
        return res.apiError({
          status: 403,
          message: "Unauthorized to update this comment",
          error: "Forbidden",
        });
      }

      const updatedComment = {
        content,
        updatedAt: Timestamp.now(),
      };

      await adminDb
        .collection("comments")
        .doc(commentId)
        .update(updatedComment);

      return res.apiResponse(
        {message: "Comment updated successfully"},
        {
          comment: {
            id: commentId,
            ...commentResult.data,
            ...updatedComment,
            updatedAt: updatedComment.updatedAt.toDate(),
          },
        }
      );
    } catch (error) {
      console.error("updateComment error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to update comment",
        error: String(error),
      });
    }
  },

  deleteComment: async (req: Request, res: Response) => {
    try {
      const postId = req.params.id;
      const commentId = req.params.commentId;
      const userId = req.user?.id;

      // Verify post exists
      const postResult = await fetchDocument<IPost>(
        "posts",
        postId,
        res,
        "Post"
      );
      if (!postResult.success) return;

      // Verify comment exists
      const commentResult = await fetchDocument<IComment>(
        "comments",
        commentId,
        res,
        "Comment"
      );
      if (!commentResult.success) return;

      // Verify comment belongs to post
      if (commentResult.data!.postId !== postId) {
        return res.apiError({
          status: 400,
          message: "Comment does not belong to this post",
          error: "Bad Request",
        });
      }

      if (
        commentResult.data!.userId !== userId &&
        postResult.data!.userId !== userId
      ) {
        return res.apiError({
          status: 403,
          message: "Unauthorized to delete this comment",
          error: "Forbidden",
        });
      }

      await adminDb.collection("comments").doc(commentId).delete();

      return res.apiResponse({message: "Comment deleted successfully"}, null);
    } catch (error) {
      console.error("deleteComment error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to delete comment",
        error: String(error),
      });
    }
  },
};

export {postController};
