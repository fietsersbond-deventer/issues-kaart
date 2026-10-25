import type { DatabaseSync } from "node:sqlite";
import { createError } from "h3";
import type { Comment } from "~~/shared/types/Comment";
import { sanitizeHtml } from "./sanitizeHtml";

export type CreateCommentInput = Pick<Comment, "issue_id" | "author_id" | "body">;
export type UpdateCommentInput = Pick<Comment, "body">;
export type CommentRow = {
  id: number;
  issue_id: number;
  author_id: number | null;
  body: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  author_name: string | null;
  author_username: string | null;
};

export function formatComment(
  row: CommentRow,
  options?: { raw?: boolean },
): Comment {
  const isDeleted = Boolean(row.deleted_at);
  const authorName = row.author_name ?? row.author_username ?? null;

  return {
    id: row.id,
    issue_id: row.issue_id,
    author_id: row.author_id,
    author_name: authorName,
    body: isDeleted && !options?.raw ? "[deleted comment]" : row.body,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    is_deleted: isDeleted,
  };
}

export function getCommentsForIssue(
  db: DatabaseSync,
  issueId: number,
  options?: { includeDeleted?: boolean; raw?: boolean },
): Comment[] {
  let query = `
    SELECT
      c.id,
      c.issue_id,
      c.author_id,
      c.body,
      c.created_at,
      c.updated_at,
      c.deleted_at,
      u.name AS author_name,
      u.username AS author_username
    FROM comments c
    LEFT JOIN users u ON u.id = c.author_id
    WHERE c.issue_id = ?
  `;

  if (options?.includeDeleted === false) {
    query += ` AND c.deleted_at IS NULL`;
  }

  query += ` ORDER BY c.created_at ASC, c.id ASC`;

  const rows = db.prepare(query).all(issueId) as unknown as CommentRow[];
  return rows.map((row) => formatComment(row, options));
}

export function getCommentById(
  db: DatabaseSync,
  id: number,
  options?: { raw?: boolean },
): Comment | null {
  const query = `
    SELECT
      c.id,
      c.issue_id,
      c.author_id,
      c.body,
      c.created_at,
      c.updated_at,
      c.deleted_at,
      u.name AS author_name,
      u.username AS author_username
    FROM comments c
    LEFT JOIN users u ON u.id = c.author_id
    WHERE c.id = ?
  `;

  const row = db.prepare(query).get(id) as unknown as CommentRow | undefined;
  if (!row) {
    return null;
  }
  return formatComment(row, options);
}

export function createComment(
  db: DatabaseSync,
  input: CreateCommentInput,
): Comment {
  if (!input.issue_id || !Number.isInteger(input.issue_id)) {
    throw createError({
      statusCode: 400,
      message: "Valid issue_id is required",
    });
  }

  if (!input.body || typeof input.body !== "string" || !input.body.trim()) {
    throw createError({
      statusCode: 400,
      message: "Comment body is required",
    });
  }

  const issueExists = db
    .prepare("SELECT id FROM issues WHERE id = ?")
    .get(input.issue_id);
  if (!issueExists) {
    throw createError({
      statusCode: 404,
      message: `Issue with ID ${input.issue_id} not found`,
    });
  }

  const sanitizedBody = sanitizeHtml(input.body).trim();
  if (!sanitizedBody) {
    throw createError({
      statusCode: 400,
      message: "Comment body cannot be empty after sanitization",
    });
  }

  const result = db
    .prepare(
      `INSERT INTO comments (issue_id, author_id, body)
       VALUES (?, ?, ?)`,
    )
    .run(input.issue_id, input.author_id, sanitizedBody);

  const commentId = Number(result.lastInsertRowid);
  const created = getCommentById(db, commentId);
  if (!created) {
    throw createError({
      statusCode: 500,
      message: "Failed to retrieve created comment",
    });
  }
  return created;
}

export function updateComment(
  db: DatabaseSync,
  id: number,
  input: UpdateCommentInput,
): Comment {
  const existing = getCommentById(db, id, { raw: true });
  if (!existing) {
    throw createError({
      statusCode: 404,
      message: `Comment with ID ${id} not found`,
    });
  }

  if (existing.deleted_at) {
    throw createError({
      statusCode: 400,
      message: "Cannot edit a deleted comment",
    });
  }

  if (!input.body || typeof input.body !== "string" || !input.body.trim()) {
    throw createError({
      statusCode: 400,
      message: "Comment body is required",
    });
  }

  const sanitizedBody = sanitizeHtml(input.body).trim();
  if (!sanitizedBody) {
    throw createError({
      statusCode: 400,
      message: "Comment body cannot be empty after sanitization",
    });
  }

  db.prepare(
    `UPDATE comments
     SET body = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).run(sanitizedBody, id);

  const updated = getCommentById(db, id);
  if (!updated) {
    throw createError({
      statusCode: 500,
      message: "Failed to retrieve updated comment",
    });
  }
  return updated;
}

export function deleteComment(
  db: DatabaseSync,
  id: number,
  options?: { soft?: boolean },
): boolean {
  const existing = getCommentById(db, id, { raw: true });
  if (!existing) {
    throw createError({
      statusCode: 404,
      message: `Comment with ID ${id} not found`,
    });
  }

  const isSoft = options?.soft !== false;
  if (isSoft) {
    db.prepare(
      `UPDATE comments
       SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    ).run(id);
  } else {
    db.prepare("DELETE FROM comments WHERE id = ?").run(id);
  }

  return true;
}

export function softDeleteComment(db: DatabaseSync, id: number): boolean {
  return deleteComment(db, id, { soft: true });
}

export function hardDeleteComment(db: DatabaseSync, id: number): boolean {
  return deleteComment(db, id, { soft: false });
}
