// .storybook/test-runner.js

import { getStoryContext } from '@storybook/test-runner';

const config = {
  // Hook that is executed before the test runner starts running tests
  setup() {
    // Add your configuration here.
    console.log('TestRunnerConfig ===>setup');
  },
  /* Hook to execute before a story is rendered.
   * The page argument is the Playwright's page object for the story.
   * The context argument is a Storybook object containing the story's id, title, and name.
   */
  async preRender(page, context) {
    page?.setDefaultTimeout(60000 * 3);
    const response = await page.waitForResponse(
      'https://api-base.vs.tencent.com/tfusion-yc325/SaaS/Account/DescribeAccount'
    );
    // const responsePromise = page.waitForResponse(
    //   (response) =>
    //     response.url() ===
    //       'https://api-base.vs.tencent.com/tfusion-yc325/SaaS/Account/DescribeAccount' &&
    //     response.status() === 200
    // );
    let res = await response.json();
    // const res = (
    //   await window.fetch(
    //     'https://api-base.vs.tencent.com/tfusion-yc325/SaaS/Account/DescribeAccount'
    //   )
    // )?.json();

    console.log(res, 'preRender ===>page', page, '===>context', context);
  },
  // Add your configuration here.
  /* Hook to execute after a story is rendered.
   * The page argument is the Playwright's page object for the story: https://playwright.dev/docs/api/class-page#methods
   * The context argument is a Storybook object containing the story's id, title, and name.
   */
  async postRender(page, context) {
    // Get the entire context of a story, including parameters, args, argTypes, etc.
    // console.log('postRender ===>page', page, '===>context', context);
    // const storyContext = await getStoryContext(page, context);
    // console.log('postRender ===>', 'storyContext', storyContext);
    // Add your configuration here.
  },
};

module.exports = config;
