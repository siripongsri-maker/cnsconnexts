export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <title>หน้านี้โหลดไม่สำเร็จ · This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.6 system-ui, "Noto Sans Thai", sans-serif; background: #faf8f5; color: #1f1a2e; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; box-sizing: border-box; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 1.75rem 1.5rem; background: #fff; border: 1px solid #ebe7f2; border-radius: 1.5rem; box-shadow: 0 12px 28px -12px rgb(31 26 46 / 0.18); box-sizing: border-box; }
      h1 { font-size: 1.25rem; margin: 0; }
      p { margin: 0.25rem 0 0; }
      .en { color: #5b556b; font-size: 0.875rem; }
      .body { margin-top: 1rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-top: 1.5rem; }
      a, button { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 1.25rem; border-radius: 1rem; font: inherit; font-weight: 700; font-size: 0.875rem; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      a:focus-visible, button:focus-visible { outline: 2px solid #6d28d9; outline-offset: 2px; }
      .primary { background: #6d28d9; color: #fff; }
      .secondary { background: #fff; color: #1f1a2e; border-color: #d6d3e0; }
    </style>
  </head>
  <body>
    <main class="card">
      <div role="alert">
        <h1>หน้านี้โหลดไม่สำเร็จ</h1>
        <p lang="en" class="en">This page didn't load</p>
        <p class="body">อาจเป็นที่สัญญาณ ลองอีกครั้งได้เลยนะ</p>
        <p lang="en" class="en">It might be the connection. Give it another try.</p>
      </div>
      <div class="actions">
        <button type="button" class="primary" onclick="location.reload()">ลองอีกครั้ง · <span lang="en">&nbsp;Try again</span></button>
        <a class="secondary" href="/">กลับหน้าแรก · <span lang="en">&nbsp;Home</span></a>
      </div>
    </main>
  </body>
</html>`;
}
