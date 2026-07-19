import { Locator, Page, expect } from '@playwright/test';
import { config } from '@config/env.config';

/**
 * BasePage centralizes navigation and wait strategies shared by every page
 * object. Concrete pages extend it instead of duplicating boilerplate.
 *
 * All waits here are web-first (Playwright auto-waiting / explicit
 * expect polling) — no fixed sleeps anywhere in the framework.
 */
export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path = ''): Promise<void> {
    await this.page.goto(new URL(path, config.baseUrl).toString(), {
      timeout: config.navigationTimeout,
      waitUntil: 'domcontentloaded',
    });
  }

  /** Waits for an element to be visible using web-first assertions. */
  async waitForVisible(locator: Locator, timeout = config.defaultTimeout): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
  }

  /** Waits until a locator's count stabilizes (useful for async result grids). */
  async waitForAtLeastOne(locator: Locator, timeout = config.defaultTimeout): Promise<void> {
    await expect
      .poll(async () => locator.count(), { timeout, message: 'Waiting for at least one matching element' })
      .toBeGreaterThan(0);
  }

  /** Waits for any pending network activity from the SPA's data fetches to settle. */
  async waitForNetworkIdle(timeout = config.navigationTimeout): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }
}
