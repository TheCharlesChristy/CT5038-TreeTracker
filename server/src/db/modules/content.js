function createContentEndpoints(ctx) {
  const { run, selectOne, runtimeExecutor, toDateInput, ensureOrder, buildUpdate, validators, NotFoundError } = ctx;
  const { assert, ensurePositiveInt, ensureStringMax, ensureRequiredString, ensureBoolean, ensureHex64, normalizeListParams } =
    validators;

  const photos = {
    async create(payload, tx) {
      ensureRequiredString("imageUrl", payload.imageUrl, 65535);
      ensureStringMax("mimeType", payload.mimeType, 100);
      if (payload.byteSize !== undefined && payload.byteSize !== null) {
        assert(Number.isInteger(payload.byteSize) && payload.byteSize >= 0, "byteSize must be an unsigned integer");
      }
      ensureHex64("sha256", payload.sha256, true);
      const createdAt = toDateInput("createdAt", payload.createdAt);

      const result = await run(
        runtimeExecutor(tx),
        "INSERT INTO photos (image_url, mime_type, byte_size, sha256, created_at) VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))",
        [payload.imageUrl, payload.mimeType || null, payload.byteSize ?? null, payload.sha256 || null, createdAt || null]
      );
      return this.getById(Number(result.insertId), tx);
    },

    async getById(id, tx) {
      ensurePositiveInt("id", id);
      return selectOne(runtimeExecutor(tx), "SELECT * FROM photos WHERE id = ?", [id]);
    },

    async getBySha256(sha256, tx) {
      ensureHex64("sha256", sha256);
      return selectOne(runtimeExecutor(tx), "SELECT * FROM photos WHERE sha256 = ?", [sha256]);
    },

    async list(params = {}, tx) {
      const { limit, offset } = normalizeListParams(params);
      return run(runtimeExecutor(tx), "SELECT * FROM photos ORDER BY id DESC LIMIT ? OFFSET ?", [limit, offset]);
    },

    async updateById(id, fields, tx) {
      ensurePositiveInt("id", id);
      if (fields.imageUrl !== undefined) ensureRequiredString("imageUrl", fields.imageUrl, 65535);
      if (fields.mimeType !== undefined) ensureStringMax("mimeType", fields.mimeType, 100);
      if (fields.byteSize !== undefined && fields.byteSize !== null) {
        assert(Number.isInteger(fields.byteSize) && fields.byteSize >= 0, "byteSize must be an unsigned integer");
      }
      if (fields.sha256 !== undefined) ensureHex64("sha256", fields.sha256, true);

      const { updates, params } = buildUpdate(fields, {
        imageUrl: "image_url",
        mimeType: "mime_type",
        byteSize: "byte_size",
        sha256: "sha256"
      });

      const result = await run(runtimeExecutor(tx), `UPDATE photos SET ${updates.join(", ")} WHERE id = ?`, [...params, id]);
      if (result.affectedRows === 0) {
        throw new NotFoundError(`Photo ${id} not found`);
      }
      return this.getById(id, tx);
    },

    async deleteById(id, tx) {
      ensurePositiveInt("id", id);
      const result = await run(runtimeExecutor(tx), "DELETE FROM photos WHERE id = ?", [id]);
      return { deleted: result.affectedRows > 0 };
    },

    async existsById(id, tx) {
      ensurePositiveInt("id", id);
      const row = await selectOne(runtimeExecutor(tx), "SELECT 1 AS ok FROM photos WHERE id = ?", [id]);
      return Boolean(row);
    }
  };

  const treePhotos = {
    async add(payload, tx) {
      ensurePositiveInt("treeId", payload.treeId);
      ensurePositiveInt("photoId", payload.photoId);
      const result = await run(runtimeExecutor(tx), "INSERT IGNORE INTO tree_photos (tree_id, photo_id) VALUES (?, ?)", [
        payload.treeId,
        payload.photoId
      ]);
      return { added: result.affectedRows > 0 };
    },

    async remove(payload, tx) {
      ensurePositiveInt("treeId", payload.treeId);
      ensurePositiveInt("photoId", payload.photoId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM tree_photos WHERE tree_id = ? AND photo_id = ?", [
        payload.treeId,
        payload.photoId
      ]);
      return { removed: result.affectedRows > 0 };
    },

    async exists(payload, tx) {
      ensurePositiveInt("treeId", payload.treeId);
      ensurePositiveInt("photoId", payload.photoId);
      const row = await selectOne(runtimeExecutor(tx), "SELECT 1 AS ok FROM tree_photos WHERE tree_id = ? AND photo_id = ?", [
        payload.treeId,
        payload.photoId
      ]);
      return Boolean(row);
    },

    async countByPhotoId(photoId, tx) {
      ensurePositiveInt("photoId", photoId);

      const row = await selectOne(
        runtimeExecutor(tx),
        "SELECT COUNT(*) AS ref_count FROM tree_photos WHERE photo_id = ?",
        [photoId]
      );

      return Number(row?.ref_count || 0);
    },

    async listPhotoIdsByTree(treeId, params = {}, tx) {
      ensurePositiveInt("treeId", treeId);
      const { limit, offset } = normalizeListParams(params);
      const rows = await run(
        runtimeExecutor(tx),
        "SELECT photo_id FROM tree_photos WHERE tree_id = ? ORDER BY photo_id DESC LIMIT ? OFFSET ?",
        [treeId, limit, offset]
      );
      return rows.map((row) => row.photo_id);
    },

    async listTreeIdsByPhoto(photoId, params = {}, tx) {
      ensurePositiveInt("photoId", photoId);
      const { limit, offset } = normalizeListParams(params);
      const rows = await run(
        runtimeExecutor(tx),
        "SELECT tree_id FROM tree_photos WHERE photo_id = ? ORDER BY tree_id DESC LIMIT ? OFFSET ?",
        [photoId, limit, offset]
      );
      return rows.map((row) => row.tree_id);
    },

    async deleteAllForTree(treeId, tx) {
      ensurePositiveInt("treeId", treeId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM tree_photos WHERE tree_id = ?", [treeId]);
      return { count: result.affectedRows };
    },

    async deleteAllForPhoto(photoId, tx) {
      ensurePositiveInt("photoId", photoId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM tree_photos WHERE photo_id = ?", [photoId]);
      return { count: result.affectedRows };
    }
  };

  const comments = {
    async create(payload = {}, tx) {
      if (payload.userId !== undefined && payload.userId !== null) {
        ensurePositiveInt("userId", payload.userId);
      }
      const createdAt = toDateInput("createdAt", payload.createdAt);
      const result = await run(runtimeExecutor(tx), "INSERT INTO comments (user_id, created_at) VALUES (?, COALESCE(?, CURRENT_TIMESTAMP))", [
        payload.userId || null,
        createdAt || null
      ]);
      return this.getById(Number(result.insertId), tx);
    },

    async getById(id, tx) {
      ensurePositiveInt("id", id);
      return selectOne(runtimeExecutor(tx), "SELECT id, user_id, created_at FROM comments WHERE id = ?", [id]);
    },

    async list(params = {}, tx) {
      const { limit, offset } = normalizeListParams(params);
      return run(runtimeExecutor(tx), "SELECT id, user_id, created_at FROM comments ORDER BY id DESC LIMIT ? OFFSET ?", [
        limit,
        offset
      ]);
    },

    async listByUserId(userId, params = {}, tx) {
      ensurePositiveInt("userId", userId);
      const { limit, offset } = normalizeListParams(params);
      return run(
        runtimeExecutor(tx),
        "SELECT id, user_id, created_at FROM comments WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?",
        [userId, limit, offset]
      );
    },

    async updateUserById(id, userIdOrNull, tx) {
      ensurePositiveInt("id", id);
      if (userIdOrNull !== null) {
        ensurePositiveInt("userId", userIdOrNull);
      }
      const result = await run(runtimeExecutor(tx), "UPDATE comments SET user_id = ? WHERE id = ?", [userIdOrNull, id]);
      if (result.affectedRows === 0) {
        throw new NotFoundError(`Comment ${id} not found`);
      }
      return this.getById(id, tx);
    },

    async deleteById(id, tx) {
      ensurePositiveInt("id", id);
      const result = await run(runtimeExecutor(tx), "DELETE FROM comments WHERE id = ?", [id]);
      return { deleted: result.affectedRows > 0 };
    }
  };

  const commentPhotos = {
    async add(payload, tx) {
      ensurePositiveInt("commentId", payload.commentId);
      ensurePositiveInt("photoId", payload.photoId);
      const result = await run(
        runtimeExecutor(tx),
        "INSERT IGNORE INTO comment_photos (comment_id, photo_id) VALUES (?, ?)",
        [payload.commentId, payload.photoId]
      );
      return { added: result.affectedRows > 0 };
    },

    async remove(payload, tx) {
      ensurePositiveInt("commentId", payload.commentId);
      ensurePositiveInt("photoId", payload.photoId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM comment_photos WHERE comment_id = ? AND photo_id = ?", [
        payload.commentId,
        payload.photoId
      ]);
      return { removed: result.affectedRows > 0 };
    },

    async exists(payload, tx) {
      ensurePositiveInt("commentId", payload.commentId);
      ensurePositiveInt("photoId", payload.photoId);
      const row = await selectOne(runtimeExecutor(tx), "SELECT 1 AS ok FROM comment_photos WHERE comment_id = ? AND photo_id = ?", [
        payload.commentId,
        payload.photoId
      ]);
      return Boolean(row);
    },

    async listPhotoIdsByComment(commentId, params = {}, tx) {
      ensurePositiveInt("commentId", commentId);
      const { limit, offset } = normalizeListParams(params);
      const rows = await run(
        runtimeExecutor(tx),
        "SELECT photo_id FROM comment_photos WHERE comment_id = ? ORDER BY photo_id DESC LIMIT ? OFFSET ?",
        [commentId, limit, offset]
      );
      return rows.map((row) => row.photo_id);
    },

    async listCommentIdsByPhoto(photoId, params = {}, tx) {
      ensurePositiveInt("photoId", photoId);
      const { limit, offset } = normalizeListParams(params);
      const rows = await run(
        runtimeExecutor(tx),
        "SELECT comment_id FROM comment_photos WHERE photo_id = ? ORDER BY comment_id DESC LIMIT ? OFFSET ?",
        [photoId, limit, offset]
      );
      return rows.map((row) => row.comment_id);
    },

    async deleteAllForComment(commentId, tx) {
      ensurePositiveInt("commentId", commentId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM comment_photos WHERE comment_id = ?", [commentId]);
      return { count: result.affectedRows };
    },

    async deleteAllForPhoto(photoId, tx) {
      ensurePositiveInt("photoId", photoId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM comment_photos WHERE photo_id = ?", [photoId]);
      return { count: result.affectedRows };
    }
  };

  const commentsTree = {
    async create(payload, tx) {
      ensurePositiveInt("commentId", payload.commentId);
      ensurePositiveInt("treeId", payload.treeId);
      ensureRequiredString("content", payload.content, 65535);
      const createdAt = toDateInput("createdAt", payload.createdAt);

      await run(
        runtimeExecutor(tx),
        "INSERT INTO comments_tree (comment_id, tree_id, content, created_at) VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))",
        [payload.commentId, payload.treeId, payload.content, createdAt || null]
      );
      return this.get({ commentId: payload.commentId, treeId: payload.treeId }, tx);
    },

    async get(payload, tx) {
      ensurePositiveInt("commentId", payload.commentId);
      ensurePositiveInt("treeId", payload.treeId);
      return selectOne(runtimeExecutor(tx), "SELECT * FROM comments_tree WHERE comment_id = ? AND tree_id = ?", [
        payload.commentId,
        payload.treeId
      ]);
    },

    async getByCommentId(commentId, tx) {
      ensurePositiveInt("commentId", commentId);
      return selectOne(runtimeExecutor(tx), "SELECT * FROM comments_tree WHERE comment_id = ?", [commentId]);
    },

    async listByTreeId(treeId, params = {}, tx) {
      ensurePositiveInt("treeId", treeId);
      const { limit, offset } = normalizeListParams(params);
      const order = ensureOrder(params.order);
      return run(
        runtimeExecutor(tx),
        `SELECT * FROM comments_tree WHERE tree_id = ? ORDER BY created_at ${order.toUpperCase()} LIMIT ? OFFSET ?`,
        [treeId, limit, offset]
      );
    },

    async updateContent(payload, tx) {
      ensurePositiveInt("commentId", payload.commentId);
      ensurePositiveInt("treeId", payload.treeId);
      ensureRequiredString("content", payload.content, 65535);
      const result = await run(runtimeExecutor(tx), "UPDATE comments_tree SET content = ? WHERE comment_id = ? AND tree_id = ?", [
        payload.content,
        payload.commentId,
        payload.treeId
      ]);
      if (result.affectedRows === 0) {
        throw new NotFoundError("comments_tree row not found");
      }
      return this.get(payload, tx);
    },

    async delete(payload, tx) {
      ensurePositiveInt("commentId", payload.commentId);
      ensurePositiveInt("treeId", payload.treeId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM comments_tree WHERE comment_id = ? AND tree_id = ?", [
        payload.commentId,
        payload.treeId
      ]);
      return { deleted: result.affectedRows > 0 };
    },

    async deleteByCommentId(commentId, tx) {
      ensurePositiveInt("commentId", commentId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM comments_tree WHERE comment_id = ?", [commentId]);
      return { count: result.affectedRows };
    },

    async deleteAllForTree(treeId, tx) {
      ensurePositiveInt("treeId", treeId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM comments_tree WHERE tree_id = ?", [treeId]);
      return { count: result.affectedRows };
    }
  };

  const commentReplies = {
    async create(payload, tx) {
      ensurePositiveInt("commentId", payload.commentId);
      ensurePositiveInt("parentCommentId", payload.parentCommentId);
      ensureRequiredString("content", payload.content, 65535);
      const createdAt = toDateInput("createdAt", payload.createdAt);

      await run(
        runtimeExecutor(tx),
        "INSERT INTO comment_replies (comment_id, parent_comment_id, content, created_at) VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))",
        [payload.commentId, payload.parentCommentId, payload.content, createdAt || null]
      );
      return this.get({ commentId: payload.commentId, parentCommentId: payload.parentCommentId }, tx);
    },

    async get(payload, tx) {
      ensurePositiveInt("commentId", payload.commentId);
      ensurePositiveInt("parentCommentId", payload.parentCommentId);
      return selectOne(runtimeExecutor(tx), "SELECT * FROM comment_replies WHERE comment_id = ? AND parent_comment_id = ?", [
        payload.commentId,
        payload.parentCommentId
      ]);
    },

    async listByParent(parentCommentId, params = {}, tx) {
      ensurePositiveInt("parentCommentId", parentCommentId);
      const { limit, offset } = normalizeListParams(params);
      const order = ensureOrder(params.order);
      return run(
        runtimeExecutor(tx),
        `SELECT * FROM comment_replies WHERE parent_comment_id = ? ORDER BY created_at ${order.toUpperCase()} LIMIT ? OFFSET ?`,
        [parentCommentId, limit, offset]
      );
    },

    async listParentsOfComment(commentId, params = {}, tx) {
      ensurePositiveInt("commentId", commentId);
      const { limit, offset } = normalizeListParams(params);
      const rows = await run(
        runtimeExecutor(tx),
        "SELECT parent_comment_id FROM comment_replies WHERE comment_id = ? ORDER BY parent_comment_id DESC LIMIT ? OFFSET ?",
        [commentId, limit, offset]
      );
      return rows.map((row) => row.parent_comment_id);
    },

    async updateContent(payload, tx) {
      ensurePositiveInt("commentId", payload.commentId);
      ensurePositiveInt("parentCommentId", payload.parentCommentId);
      ensureRequiredString("content", payload.content, 65535);
      const result = await run(
        runtimeExecutor(tx),
        "UPDATE comment_replies SET content = ? WHERE comment_id = ? AND parent_comment_id = ?",
        [payload.content, payload.commentId, payload.parentCommentId]
      );
      if (result.affectedRows === 0) {
        throw new NotFoundError("comment_replies row not found");
      }
      return this.get(payload, tx);
    },

    async delete(payload, tx) {
      ensurePositiveInt("commentId", payload.commentId);
      ensurePositiveInt("parentCommentId", payload.parentCommentId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM comment_replies WHERE comment_id = ? AND parent_comment_id = ?", [
        payload.commentId,
        payload.parentCommentId
      ]);
      return { deleted: result.affectedRows > 0 };
    },

    async deleteByCommentId(commentId, tx) {
      ensurePositiveInt("commentId", commentId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM comment_replies WHERE comment_id = ?", [commentId]);
      return { count: result.affectedRows };
    },

    async deleteAllForParent(parentCommentId, tx) {
      ensurePositiveInt("parentCommentId", parentCommentId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM comment_replies WHERE parent_comment_id = ?", [parentCommentId]);
      return { count: result.affectedRows };
    }
  };

  const wildlifeObservations = {
    async create(payload, tx) {
      ensurePositiveInt("commentId", payload.commentId);
      ensurePositiveInt("treeId", payload.treeId);
      ensureRequiredString("wildlife", payload.wildlife, 255);
      ensureBoolean("wildlifeFound", payload.wildlifeFound);
      ensureStringMax("observationNotes", payload.observationNotes, 65535);

      await run(
        runtimeExecutor(tx),
        "INSERT INTO wildlife_observations (comment_id, tree_id, wildlife, wildlife_found, observation_notes) VALUES (?, ?, ?, ?, ?)",
        [payload.commentId, payload.treeId, payload.wildlife, payload.wildlifeFound ? 1 : 0, payload.observationNotes || null]
      );
      return this.getByCommentId(payload.commentId, tx);
    },

    async getByCommentId(commentId, tx) {
      ensurePositiveInt("commentId", commentId);
      return selectOne(runtimeExecutor(tx), "SELECT * FROM wildlife_observations WHERE comment_id = ?", [commentId]);
    },

    async listByTreeId(treeId, params = {}, tx) {
      ensurePositiveInt("treeId", treeId);
      const { limit, offset } = normalizeListParams(params);
      const order = ensureOrder(params.order);
      return run(
        runtimeExecutor(tx),
        `SELECT * FROM wildlife_observations WHERE tree_id = ? ORDER BY comment_id ${order.toUpperCase()} LIMIT ? OFFSET ?`,
        [treeId, limit, offset]
      );
    },

    async updateByCommentId(commentId, fields, tx) {
      ensurePositiveInt("commentId", commentId);
      if (fields.wildlife !== undefined) ensureRequiredString("wildlife", fields.wildlife, 255);
      if (fields.wildlifeFound !== undefined) ensureBoolean("wildlifeFound", fields.wildlifeFound);
      if (fields.observationNotes !== undefined) ensureStringMax("observationNotes", fields.observationNotes, 65535);

      const mappedFields = { ...fields };
      if (mappedFields.wildlifeFound !== undefined) {
        mappedFields.wildlifeFound = mappedFields.wildlifeFound ? 1 : 0;
      }

      const { updates, params } = buildUpdate(mappedFields, {
        wildlife: "wildlife",
        wildlifeFound: "wildlife_found",
        observationNotes: "observation_notes"
      });

      const result = await run(
        runtimeExecutor(tx),
        `UPDATE wildlife_observations SET ${updates.join(", ")} WHERE comment_id = ?`,
        [...params, commentId]
      );
      if (result.affectedRows === 0) {
        throw new NotFoundError("wildlife observation not found");
      }
      return this.getByCommentId(commentId, tx);
    },

    async deleteByCommentId(commentId, tx) {
      ensurePositiveInt("commentId", commentId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM wildlife_observations WHERE comment_id = ?", [commentId]);
      return { deleted: result.affectedRows > 0 };
    }
  };

  const diseaseObservations = {
    async create(payload, tx) {
      ensurePositiveInt("commentId", payload.commentId);
      ensurePositiveInt("treeId", payload.treeId);
      ensureRequiredString("disease", payload.disease, 255);
      ensureStringMax("evidence", payload.evidence, 65535);

      await run(
        runtimeExecutor(tx),
        "INSERT INTO disease_observations (comment_id, tree_id, disease, evidence) VALUES (?, ?, ?, ?)",
        [payload.commentId, payload.treeId, payload.disease, payload.evidence || null]
      );
      return this.getByCommentId(payload.commentId, tx);
    },

    async getByCommentId(commentId, tx) {
      ensurePositiveInt("commentId", commentId);
      return selectOne(runtimeExecutor(tx), "SELECT * FROM disease_observations WHERE comment_id = ?", [commentId]);
    },

    async listByTreeId(treeId, params = {}, tx) {
      ensurePositiveInt("treeId", treeId);
      const { limit, offset } = normalizeListParams(params);
      const order = ensureOrder(params.order);
      return run(
        runtimeExecutor(tx),
        `SELECT * FROM disease_observations WHERE tree_id = ? ORDER BY comment_id ${order.toUpperCase()} LIMIT ? OFFSET ?`,
        [treeId, limit, offset]
      );
    },

    async updateByCommentId(commentId, fields, tx) {
      ensurePositiveInt("commentId", commentId);
      if (fields.disease !== undefined) ensureRequiredString("disease", fields.disease, 255);
      if (fields.evidence !== undefined) ensureStringMax("evidence", fields.evidence, 65535);

      const { updates, params } = buildUpdate(fields, {
        disease: "disease",
        evidence: "evidence"
      });

      const result = await run(
        runtimeExecutor(tx),
        `UPDATE disease_observations SET ${updates.join(", ")} WHERE comment_id = ?`,
        [...params, commentId]
      );
      if (result.affectedRows === 0) {
        throw new NotFoundError("disease observation not found");
      }
      return this.getByCommentId(commentId, tx);
    },

    async deleteByCommentId(commentId, tx) {
      ensurePositiveInt("commentId", commentId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM disease_observations WHERE comment_id = ?", [commentId]);
      return { deleted: result.affectedRows > 0 };
    }
  };

  const seenObservations = {
    async create(payload, tx) {
      ensurePositiveInt("commentId", payload.commentId);
      ensurePositiveInt("treeId", payload.treeId);
      ensureStringMax("observationNotes", payload.observationNotes, 65535);
      await run(runtimeExecutor(tx), "INSERT INTO seen_observations (comment_id, tree_id, observation_notes) VALUES (?, ?, ?)", [
        payload.commentId,
        payload.treeId,
        payload.observationNotes || null
      ]);
      return this.getByCommentId(payload.commentId, tx);
    },

    async getByCommentId(commentId, tx) {
      ensurePositiveInt("commentId", commentId);
      return selectOne(runtimeExecutor(tx), "SELECT * FROM seen_observations WHERE comment_id = ?", [commentId]);
    },

    async listByTreeId(treeId, params = {}, tx) {
      ensurePositiveInt("treeId", treeId);
      const { limit, offset } = normalizeListParams(params);
      const order = ensureOrder(params.order);
      return run(
        runtimeExecutor(tx),
        `SELECT * FROM seen_observations WHERE tree_id = ? ORDER BY comment_id ${order.toUpperCase()} LIMIT ? OFFSET ?`,
        [treeId, limit, offset]
      );
    },

    async updateByCommentId(commentId, fields, tx) {
      ensurePositiveInt("commentId", commentId);
      if (fields.observationNotes !== undefined) ensureStringMax("observationNotes", fields.observationNotes, 65535);

      const { updates, params } = buildUpdate(fields, {
        observationNotes: "observation_notes"
      });

      const result = await run(
        runtimeExecutor(tx),
        `UPDATE seen_observations SET ${updates.join(", ")} WHERE comment_id = ?`,
        [...params, commentId]
      );
      if (result.affectedRows === 0) {
        throw new NotFoundError("seen observation not found");
      }
      return this.getByCommentId(commentId, tx);
    },

    async deleteByCommentId(commentId, tx) {
      ensurePositiveInt("commentId", commentId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM seen_observations WHERE comment_id = ?", [commentId]);
      return { deleted: result.affectedRows > 0 };
    }
  };

  return {
    photos,
    treePhotos,
    comments,
    commentPhotos,
    commentsTree,
    commentReplies,
    wildlifeObservations,
    diseaseObservations,
    seenObservations
  };
}

module.exports = {
  createContentEndpoints
};
