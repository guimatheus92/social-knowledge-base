import { chromium } from "@playwright/test";
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1300, height: 1000 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
try { await page.getByText(/Instagram/).first().click({ timeout: 4000 }); } catch {}
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const orig = Event.prototype.preventDefault;
  window.__pd = [];
  Event.prototype.preventDefault = function() {
    if (this.type === 'click') window.__pd.push(new Error().stack.split('\n').slice(1,6).join(' | '));
    return orig.apply(this, arguments);
  };
});
await page.getByRole("link", { name: /Library|Biblioteca/i }).last().click({ timeout: 5000 }).catch(()=>{});
await page.waitForTimeout(800);
const pd = await page.evaluate(() => window.__pd);
console.log("preventDefault calls on click:", pd.length);
pd.forEach((s,i)=>console.log(`#${i}:`, s.slice(0,400)));
console.log("url:", page.url().replace("http://localhost:3000",""));
await b.close();
