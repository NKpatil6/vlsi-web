import { test, expect, _electron as electron } from '@playwright/test';
import path from 'node:path';

const appPath = path.resolve(__dirname, '..', 'release', 'win-unpacked');
const exePath = path.join(appPath, 'VLSI Tracker.exe');

const PAGES = [
  { name: 'Dashboard', hash: '#/dashboard' },
  { name: 'Syllabus', hash: '#/syllabus' },
  { name: 'Sessions', hash: '#/sessions' },
  { name: 'AI Explorer', hash: '#/ai-explorer' },
  { name: 'Quiz', hash: '#/quiz' },
  { name: 'Flashcards', hash: '#/flashcards' },
  { name: 'Coding', hash: '#/coding' },
  { name: 'Interview', hash: '#/interview' },
  { name: 'Analytics', hash: '#/analytics' },
  { name: 'Achievements', hash: '#/achievements' },
  { name: 'Settings', hash: '#/settings' },
];

let electronApp: Awaited<ReturnType<typeof electron.launch>>;
let window: Awaited<ReturnType<typeof electronApp.firstWindow>>;

test.beforeAll(async () => {
  electronApp = await electron.launch({
    executablePath: exePath,
    args: [appPath],
  });
  window = await electronApp.firstWindow();
  await window.waitForSelector('#root > *', { timeout: 15000 });
});

test.afterAll(async () => {
  await electronApp.close();
});

test('dashboard loads without errors', async () => {
  const rootContent = await window.locator('#root').innerHTML();
  expect(rootContent.length).toBeGreaterThan(0);

  const bodyText = await window.locator('body').innerText();
  expect(bodyText).not.toContain('React is not defined');
  expect(bodyText).not.toContain('404 Not Found');
  expect(bodyText).not.toContain('Unexpected Application Error');
});

for (const page of PAGES) {
  test(`navigate to ${page.name} renders correctly`, async () => {
    // Navigate by clicking the sidebar link (first match to avoid ambiguity)
    const link = window.locator(`a[href="${page.hash}"]`).first();
    await link.click();

    // Wait for content to render
    await window.waitForTimeout(500);

    // Check no error overlays
    const bodyText = await window.locator('body').innerText();
    expect(bodyText).not.toContain('React is not defined');
    expect(bodyText).not.toContain('404 Not Found');
    expect(bodyText).not.toContain('Unexpected Application Error');
    expect(bodyText).not.toContain('Not allowed to load local resource');

    // Check root has rendered content
    const rootContent = await window.locator('#root').innerHTML();
    expect(rootContent.length).toBeGreaterThan(0);
  });
}
