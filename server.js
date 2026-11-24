// where_meet 서버 (공용 파일 - 수정 전 단톡방에 알려주세요)
// 규칙: src/<기능폴더>/index.html  -> https://주소/<기능폴더>/ 화면
//       src/<기능폴더>/routes.js   -> https://주소/api/<기능폴더>/... 서버 기능 (있을 때만)
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// DB 연결 (Railway Variables의 DATABASE_URL 사용)
let db = null;
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  db = new Pool({ connectionString: process.env.DATABASE_URL });
}
app.locals.db = db; // 각 routes.js에서 req.app.locals.db 로 사용

// 상태 확인: /api/health
app.get('/api/health', async (req, res) => {
  let dbStatus = 'not connected';
  if (db) {
    try {
      await db.query('SELECT 1');
      dbStatus = 'ok';
    } catch (e) {
      dbStatus = 'error';
    }
  }
  res.json({ status: 'ok', db: dbStatus });
});

const SRC = path.join(__dirname, 'src');

// 첫 화면 + 공용 스타일
app.use('/', express.static(path.join(SRC, 'common')));

// 기능 폴더 자동 연결
for (const name of fs.readdirSync(SRC)) {
  const dir = path.join(SRC, name);
  if (name === 'common' || !fs.statSync(dir).isDirectory()) continue;

  const routesFile = path.join(dir, 'routes.js');
  if (fs.existsSync(routesFile)) {
    app.use('/api/' + name, require(routesFile));
  }

  // 서버 코드(routes.js)는 화면으로 노출하지 않음
  app.use('/' + name, (req, res, next) =>
    req.path.endsWith('routes.js') ? res.sendStatus(404) : next()
  );
  app.use('/' + name, express.static(dir));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('where_meet running on port ' + PORT));
