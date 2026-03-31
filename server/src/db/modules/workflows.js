function createWorkflows(ctx) {
  const {
    transaction,
    run,
    runtimeExecutor,
    toDateInput,
    validators,
    NotFoundError,
    users,
    userPasswords,
    admins,
    userSessions,
    trees,
    treeCreationData,
    treeData,
    guardians,
    photos,
    treePhotos,
    comments,
    commentPhotos,
    commentsTree,
    commentReplies,
    wildlifeObservations,
    diseaseObservations,
    seenObservations
  } = ctx;

  const { ensurePositiveInt, ensureRequiredString, ensureHex64, normalizeListParams } = validators;

  return {
    auth: {
      async registerUser(payload) {
        ensureRequiredString("username", payload.username, 100);
        ensureRequiredString("passwordHash", payload.passwordHash, 255);
        return transaction(async (tx) => {
          const user = await users.create(
            {
              username: payload.username,
              email: payload.email,
              phone: payload.phone
            },
            tx
          );
          await userPasswords.setForUser(user.id, payload.passwordHash, tx);
          return { userId: user.id };
        });
      },

      async createSession(payload) {
        const session = await userSessions.create(payload);
        return { sessionId: session.id };
      },

      async validateSession(payload) {
        ensureHex64("sessionToken", payload.sessionToken);
        const now = toDateInput("now", payload.now) || new Date();
        const session = await userSessions.getByToken(payload.sessionToken);
        if (!session) {
          return { valid: false };
        }
        if (new Date(session.expires_at) <= now) {
          return { valid: false };
        }
        return { valid: true, userId: Number(session.user_id) };
      },

      async logout(payload) {
        ensureHex64("sessionToken", payload.sessionToken);
        await userSessions.deleteByToken(payload.sessionToken);
        return { loggedOut: true };
      }
    },

    trees: {
      async createTreeWithMeta(payload) {
        return transaction(async (tx) => {
          const tree = await trees.create({ latitude: payload.latitude, longitude: payload.longitude }, tx);
          await treeCreationData.create(
            {
              treeId: tree.id,
              creatorUserId: payload.creatorUserId
            },
            tx
          );
          return { treeId: tree.id };
        });
      },

      async setTreeData(payload) {
        ensurePositiveInt("treeId", payload.treeId);
        const existing = await treeData.getByTreeId(payload.treeId);
        if (existing) {
          await treeData.updateByTreeId(payload.treeId, payload.treeDataFields || {});
        } else {
          await treeData.create({ treeId: payload.treeId, ...(payload.treeDataFields || {}) });
        }
        return { updated: true };
      },

      async getTreeDetails(treeId) {
        ensurePositiveInt("treeId", treeId);
        const tree = await trees.getById(treeId);
        if (!tree) {
          throw new NotFoundError(`Tree ${treeId} not found`);
        }

        const [creationData, dataRow, photoIds, guardiansUserIds] = await Promise.all([
          treeCreationData.getByTreeId(treeId),
          treeData.getByTreeId(treeId),
          treePhotos.listPhotoIdsByTree(treeId, { limit: 500, offset: 0 }),
          guardians.listByTree(treeId, { limit: 500, offset: 0 })
        ]);

        return {
          tree,
          creationData,
          treeData: dataRow,
          photoIds,
          guardiansUserIds
        };
      },

      async getTreeFeed(treeId, params = {}) {
        ensurePositiveInt("treeId", treeId);
        const { limit, offset } = normalizeListParams(params);

        return run(
          runtimeExecutor(),
          `
            SELECT
              'tree_comment' AS item_type,
              ct.comment_id,
              ct.created_at,
              ct.content,
              NULL AS extra,
              c.user_id,
              u.username
            FROM comments_tree ct
            INNER JOIN comments c ON c.id = ct.comment_id
            LEFT JOIN users u ON u.id = c.user_id
            WHERE ct.tree_id = ?

            UNION ALL

            SELECT
              'wildlife' AS item_type,
              wo.comment_id,
              c.created_at,
              wo.observation_notes AS content,
              wo.wildlife AS extra,
              c.user_id,
              u.username
            FROM wildlife_observations wo
            INNER JOIN comments c ON c.id = wo.comment_id
            LEFT JOIN users u ON u.id = c.user_id
            WHERE wo.tree_id = ?

            UNION ALL

            SELECT
              'disease' AS item_type,
              dobs.comment_id,
              c.created_at,
              dobs.evidence AS content,
              dobs.disease AS extra,
              c.user_id,
              u.username
            FROM disease_observations dobs
            INNER JOIN comments c ON c.id = dobs.comment_id
            LEFT JOIN users u ON u.id = c.user_id
            WHERE dobs.tree_id = ?

            UNION ALL

            SELECT
              'seen' AS item_type,
              so.comment_id,
              c.created_at,
              so.observation_notes AS content,
              NULL AS extra,
              c.user_id,
              u.username
            FROM seen_observations so
            INNER JOIN comments c ON c.id = so.comment_id
            LEFT JOIN users u ON u.id = c.user_id
            WHERE so.tree_id = ?

            UNION ALL

            SELECT
              'reply' AS item_type,
              cr.comment_id,
              cr.created_at,
              cr.content,
              CAST(cr.parent_comment_id AS CHAR) AS extra,
              c.user_id,
              u.username
            FROM comment_replies cr
            INNER JOIN comments c ON c.id = cr.comment_id
            LEFT JOIN users u ON u.id = c.user_id
            INNER JOIN comments_tree ct2 ON ct2.comment_id = cr.parent_comment_id
            WHERE ct2.tree_id = ?

            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
          `,
          [treeId, treeId, treeId, treeId, treeId, limit, offset]
        );
      }
    },

    photos: {
      async addPhotoAndAttachToTree(payload) {
        ensurePositiveInt("treeId", payload.treeId);
        return transaction(async (tx) => {
          let photoRow = null;
          if (payload.photo.sha256) {
            photoRow = await photos.getBySha256(payload.photo.sha256, tx);
          }
          if (!photoRow) {
            photoRow = await photos.create(payload.photo, tx);
          }
          await treePhotos.add({ treeId: payload.treeId, photoId: photoRow.id }, tx);
          return { photoId: Number(photoRow.id) };
        });
      },

      async addPhotoAndAttachToComment(payload) {
        ensurePositiveInt("commentId", payload.commentId);
        return transaction(async (tx) => {
          let photoRow = null;
          if (payload.photo.sha256) {
            photoRow = await photos.getBySha256(payload.photo.sha256, tx);
          }
          if (!photoRow) {
            photoRow = await photos.create(payload.photo, tx);
          }
          await commentPhotos.add({ commentId: payload.commentId, photoId: photoRow.id }, tx);
          return { photoId: Number(photoRow.id) };
        });
      }
    },

    comments: {
      async addTreeComment(payload) {
        ensurePositiveInt("treeId", payload.treeId);
        ensureRequiredString("content", payload.content, 65535);
        return transaction(async (tx) => {
          const comment = await comments.create({ userId: payload.userId }, tx);
          await commentsTree.create({ commentId: comment.id, treeId: payload.treeId, content: payload.content }, tx);

          if (Array.isArray(payload.photoIds)) {
            for (const photoId of payload.photoIds) {
              ensurePositiveInt("photoId", photoId);
              await commentPhotos.add({ commentId: comment.id, photoId }, tx);
            }
          }

          return { commentId: comment.id };
        });
      },

      async deleteTreeComment(payload) {
        ensurePositiveInt("commentId", payload.commentId);
        ensurePositiveInt("userId", payload.userId);

        return transaction(async (tx) => {
          const existing = await comments.getById(payload.commentId, tx);

          if (!existing) {
            throw new NotFoundError(`Comment ${payload.commentId} not found`);
          }

          const isOwner = Number(existing.user_id) === Number(payload.userId);
          const isAdmin = await admins.isAdmin(payload.userId, tx);

          if (!isOwner && !isAdmin) {
            const error = new Error("You can only delete your own comments unless you are an admin");
            error.name = "ForbiddenError";
            throw error;
          }

          await run(runtimeExecutor(tx), "DELETE FROM comment_photos WHERE comment_id = ?", [
            payload.commentId
          ]);

          await run(
            runtimeExecutor(tx),
            "DELETE FROM comment_replies WHERE comment_id = ? OR parent_comment_id = ?",
            [payload.commentId, payload.commentId]
          );

          await run(runtimeExecutor(tx), "DELETE FROM comments_tree WHERE comment_id = ?", [
            payload.commentId
          ]);

          await run(runtimeExecutor(tx), "DELETE FROM wildlife_observations WHERE comment_id = ?", [
            payload.commentId
          ]);

          await run(runtimeExecutor(tx), "DELETE FROM disease_observations WHERE comment_id = ?", [
            payload.commentId
          ]);

          await run(runtimeExecutor(tx), "DELETE FROM seen_observations WHERE comment_id = ?", [
            payload.commentId
          ]);

          await run(runtimeExecutor(tx), "DELETE FROM comments WHERE id = ?", [
            payload.commentId
          ]);

          return { deleted: true };
        });
      },

      async replyToComment(payload) {
        ensurePositiveInt("parentCommentId", payload.parentCommentId);
        ensureRequiredString("content", payload.content, 65535);
        return transaction(async (tx) => {
          const comment = await comments.create({ userId: payload.userId }, tx);
          await commentReplies.create(
            {
              commentId: comment.id,
              parentCommentId: payload.parentCommentId,
              content: payload.content
            },
            tx
          );

          if (Array.isArray(payload.photoIds)) {
            for (const photoId of payload.photoIds) {
              ensurePositiveInt("photoId", photoId);
              await commentPhotos.add({ commentId: comment.id, photoId }, tx);
            }
          }

          return { commentId: comment.id };
        });
      }
    },

    observations: {
      async addWildlifeObservation(payload) {
        ensurePositiveInt("treeId", payload.treeId);
        return transaction(async (tx) => {
          const comment = await comments.create({ userId: payload.userId }, tx);
          await wildlifeObservations.create(
            {
              commentId: comment.id,
              treeId: payload.treeId,
              wildlife: payload.wildlife,
              wildlifeFound: payload.wildlifeFound,
              observationNotes: payload.observationNotes
            },
            tx
          );

          if (Array.isArray(payload.photoIds)) {
            for (const photoId of payload.photoIds) {
              ensurePositiveInt("photoId", photoId);
              await commentPhotos.add({ commentId: comment.id, photoId }, tx);
            }
          }

          return { commentId: comment.id };
        });
      },

      async addDiseaseObservation(payload) {
        ensurePositiveInt("treeId", payload.treeId);
        return transaction(async (tx) => {
          const comment = await comments.create({ userId: payload.userId }, tx);
          await diseaseObservations.create(
            {
              commentId: comment.id,
              treeId: payload.treeId,
              disease: payload.disease,
              evidence: payload.evidence
            },
            tx
          );

          if (Array.isArray(payload.photoIds)) {
            for (const photoId of payload.photoIds) {
              ensurePositiveInt("photoId", photoId);
              await commentPhotos.add({ commentId: comment.id, photoId }, tx);
            }
          }

          return { commentId: comment.id };
        });
      },

      async addSeenObservation(payload) {
        ensurePositiveInt("treeId", payload.treeId);
        return transaction(async (tx) => {
          const comment = await comments.create({ userId: payload.userId }, tx);
          await seenObservations.create(
            {
              commentId: comment.id,
              treeId: payload.treeId,
              observationNotes: payload.observationNotes
            },
            tx
          );

          if (Array.isArray(payload.photoIds)) {
            for (const photoId of payload.photoIds) {
              ensurePositiveInt("photoId", photoId);
              await commentPhotos.add({ commentId: comment.id, photoId }, tx);
            }
          }

          return { commentId: comment.id };
        });
      }
    },

    users: {
      async getUserProfile(userId) {
        ensurePositiveInt("userId", userId);
        const user = await users.getById(userId);
        if (!user) {
          throw new NotFoundError(`User ${userId} not found`);
        }
        const [isAdmin, guardianTreeIds] = await Promise.all([
          admins.isAdmin(userId),
          guardians.listByUser(userId, { limit: 500, offset: 0 })
        ]);

        return {
          user,
          isAdmin,
          guardianTreeIds
        };
      }
    }
  };
}

module.exports = {
  createWorkflows
};
