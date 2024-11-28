import { pool } from "../../../app.js";

// 다건 조회
const posts = async (req, res) => {
  try {
    const { title } = req.query;
    let query = "SELECT * FROM posts";
    let params = [];

    if (title) {
      query += " WHERE title ILIKE $1";
      params.push(`%${title}%`);
    }

    const { rows } = await pool.query(query, params);
    console.log("Posts Query Result:", rows); // 쿼리 결과 확인을 위한 로그
    res.json({
      resultCode: "S-1",
      msg: "성공",
      data: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "에러 발생",
    });
  }
};
// 단건 조회
const post = async (req, res) => {
  try {
    const { post_id } = req.params;
    const { rows } = await pool.query(
      "SELECT * FROM posts WHERE post_id = $1",
      [post_id]
    );
    console.log("Single Post Query Result:", rows); // 쿼리 결과 확인을 위한 로그
    res.json({
      resultCode: "S-1",
      msg: "성공",
      data: rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "에러 발생",
    });
  }
};

// 생성
const createpost = async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      resultCode: "F-2",
      msg: "로그인이 필요합니다.",
    });
  }

  try {
    const { post_title, post_content } = req.body;
    const username = req.session.username;
    const userId = req.session.userId; // 세션에서 userId 가져오기

    const post_date = new Date().toISOString().slice(0, 10);

    const query = `
      INSERT INTO posts (title, content, post_date, username, author_id) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `;
    const values = [post_title, post_content, post_date, username, userId];

    const { rows } = await pool.query(query, values);
    console.log("Query Result:", rows); // 쿼리 결과 확인을 위한 로그

    if (rows.length === 0) {
      return res.status(400).json({
        resultCode: "F-2",
        msg: "글 작성 실패",
      });
    }

    res.json({
      resultCode: "S-1",
      msg: "성공",
      data: rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "에러 발생",
    });
  }
};

const remotepost = async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      resultCode: "F-2",
      msg: "로그인이 필요합니다.",
    });
  }
  const userId = req.session.userId; // 로그인된 사용자 ID

  try {
    const { postId, post_title, post_content, post_date } = req.body;

    // 클라이언트에서 post_date 값을 제공하지 않은 경우, 현재 시간을 기본 값으로 사용
    const actualPostDate = post_date || new Date();

    const query = `
      UPDATE posts
      SET title = $1, content = $2, post_date = $3
      WHERE post_id = $4 AND userId = $5
      RETURNING *
    `;

    const values = [post_title, post_content, actualPostDate, postId, userId];

    const { rows } = await pool.query(query, values);
    console.log("Update Query Result:", rows);

    if (rows.length === 0) {
      return res.status(400).json({
        resultCode: "F-2",
        msg: "글 수정 실패",
      });
    }

    res.json({
      resultCode: "S-1",
      msg: "성공",
      data: rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "에러 발생",
    });
  }
};

// 삭제
const deletepost = async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      resultCode: "F-2",
      msg: "로그인이 필요합니다.",
    });
  }

  try {
    const { post_id } = req.params;
    const userId = req.session.userId; // 로그인된 사용자 ID

    const { rows } = await pool.query(
      "DELETE FROM posts WHERE post_id = $1 AND author_id = $2 RETURNING *",
      [post_id, userId]
    );
    console.log("Delete Query Result:", rows); // 삭제 결과 확인을 위한 로그

    if (rows.length > 0) {
      res.json({
        resultCode: "S-1",
        msg: "성공",
        data: rows[0],
      });
    } else {
      res.status(404).json({
        resultCode: "F-1",
        msg: "해당 포스트를 찾을 수 없습니다.",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "에러 발생",
    });
  }
};
const userPosts = async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      resultCode: "F-2",
      msg: "로그인이 필요합니다.",
    });
  }

  const userId = req.session.userId;

  try {
    const query = `
      SELECT 
        p.post_id,
        p.title,
        p.content,
        p.post_date,
        p.username
      FROM 
        posts p
      JOIN 
        users u ON p.author_id = u.id
      WHERE 
        p.author_id = $1
      ORDER BY 
        p.post_date DESC
    `;

    const { rows } = await pool.query(query, [userId]);

    res.json({
      resultCode: "S-1",
      msg: "유저 작성 글 조회 성공",
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "유저 작성 글 조회 실패",
      error: error.message,
    });
  }
};
export default {
  posts,
  post,
  createpost,
  remotepost,
  deletepost,
  userPosts,
};
