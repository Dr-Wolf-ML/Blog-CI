const Page = require('./helpers/page');

beforeEach(async () => {
  page = await Page.build();
  await page.goto('http://localhost:3000');
});

afterEach(async () => {
  await page.close();
});

test('header shows the logo Blogster', async () => {
  const text = await page.getContentsOf('a.brand-logo');
  expect(text).toEqual('Blogster');
});

test('clicking link starts oauth flow', async () => {
  await page.click('.right a');
  const url = await page.url();
  expect(url).toContain('accounts.google.com');
  // Stephen's alternative with RegEx
  expect(url).toMatch(/accounts\.google\.com/);
  // and as per Jest documentation...
  expect(url).toMatch(new RegExp('accounts.google.com'));
});

test('when siged in, shows Logout button', async () => {
  await page.login();
  const text = await page.getContentsOf('a[href="/auth/logout"]');
  expect(text).toEqual('Logout');
});
