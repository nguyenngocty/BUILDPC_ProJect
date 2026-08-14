const { pool } = require("../config/database");

async function hasRecentRequest(
  userId,
  cooldownSeconds
) {
  const cutoff = new Date(
    Date.now() -
      Number(cooldownSeconds || 60) * 1000
  );

  const [rows] = await pool.execute(
    `
      SELECT id

      FROM password_reset_tokens

      WHERE user_id = ?
        AND created_at >= ?
        AND used_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP

      ORDER BY id DESC
      LIMIT 1
    `,
    [userId, cutoff]
  );

  return Boolean(rows[0]);
}

async function invalidateUnusedTokens(userId) {
  await pool.execute(
    `
      UPDATE password_reset_tokens

      SET used_at = CURRENT_TIMESTAMP

      WHERE user_id = ?
        AND used_at IS NULL
    `,
    [userId]
  );
}

async function createToken({
  userId,
  tokenHash,
  expiresAt,
}) {
  const [result] = await pool.execute(
    `
      INSERT INTO password_reset_tokens (
        user_id,
        token_hash,
        expires_at
      )
      VALUES (?, ?, ?)
    `,
    [
      userId,
      tokenHash,
      expiresAt,
    ]
  );

  return {
    id: result.insertId,
    userId,
    tokenHash,
    expiresAt,
  };
}

async function markUsedById(tokenId) {
  const [result] = await pool.execute(
    `
      UPDATE password_reset_tokens

      SET used_at = CURRENT_TIMESTAMP

      WHERE id = ?
        AND used_at IS NULL
    `,
    [tokenId]
  );

  return result.affectedRows > 0;
}

async function findValidByHash(tokenHash) {
  const [rows] = await pool.execute(
    `
      SELECT
        prt.id,
        prt.user_id,
        prt.expires_at,
        prt.created_at,

        u.email,
        u.full_name,
        u.password,
        u.status,

        r.status AS role_status

      FROM password_reset_tokens prt

      INNER JOIN users u
        ON u.id = prt.user_id

      INNER JOIN roles r
        ON r.id = u.role_id

      WHERE prt.token_hash = ?
        AND prt.used_at IS NULL
        AND prt.expires_at > CURRENT_TIMESTAMP
        AND u.deleted_at IS NULL
        AND r.deleted_at IS NULL

      LIMIT 1
    `,
    [tokenHash]
  );

  return rows[0] || null;
}

async function consumeAndUpdatePassword({
  tokenId,
  tokenHash,
  userId,
  passwordHash,
}) {
  const connection =
    await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [tokenRows] =
      await connection.execute(
        `
          SELECT
            id,
            user_id

          FROM password_reset_tokens

          WHERE id = ?
            AND user_id = ?
            AND token_hash = ?
            AND used_at IS NULL
            AND expires_at > CURRENT_TIMESTAMP

          LIMIT 1
          FOR UPDATE
        `,
        [
          tokenId,
          userId,
          tokenHash,
        ]
      );

    if (!tokenRows[0]) {
      await connection.rollback();
      return false;
    }

    const [userResult] =
      await connection.execute(
        `
          UPDATE users

          SET
            password = ?,
            updated_at = CURRENT_TIMESTAMP

          WHERE id = ?
            AND deleted_at IS NULL
        `,
        [
          passwordHash,
          userId,
        ]
      );

    if (userResult.affectedRows === 0) {
      await connection.rollback();
      return false;
    }

    const [tokenResult] =
      await connection.execute(
        `
          UPDATE password_reset_tokens

          SET used_at = CURRENT_TIMESTAMP

          WHERE id = ?
            AND used_at IS NULL
        `,
        [tokenId]
      );

    if (tokenResult.affectedRows === 0) {
      await connection.rollback();
      return false;
    }

    await connection.execute(
      `
        UPDATE password_reset_tokens

        SET used_at = CURRENT_TIMESTAMP

        WHERE user_id = ?
          AND id <> ?
          AND used_at IS NULL
      `,
      [
        userId,
        tokenId,
      ]
    );

    await connection.commit();

    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  hasRecentRequest,
  invalidateUnusedTokens,
  createToken,
  markUsedById,
  findValidByHash,
  consumeAndUpdatePassword,
};