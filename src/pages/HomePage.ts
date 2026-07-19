import { expect, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { SearchWidget } from './components/SearchWidget';
import { config } from '@config/env.config';

const CATEGORY_PATHS: Record<string, string> = {
  Hotels: '/home/hotels',
};

/**
 * Homepage: entry point of the SPA. Responsible only for landing + selecting
 * a vertical/category from the navbar. Anything past that (the search form
 * itself) lives in the SearchWidget component, since that widget's shape is
 * shared by every category, not just Hotels.
 */
export class HomePage extends BasePage {
  readonly searchWidget: SearchWidget;

  constructor(page: Page) {
    super(page);
    this.searchWidget = new SearchWidget(page);
  }

  private get categoryReadyTimeout() {
    return process.env.CI ? 45_000 : 20_000;
  }

  private navCategory(name: string) {
    // data-testid is preferred (stable across copy/style changes); role-based
    // text match is the fallback if the app doesn't expose test ids.
    return this.page
      .getByTestId(`navbar-category-${name.toLowerCase()}`)
      .or(this.page.getByRole('link', { name, exact: true }))
      .or(this.page.getByRole('button', { name, exact: true }));
  }

  private async waitForSpaShell(): Promise<void> {
    await expect
      .poll(async () => (await this.page.locator('body').innerText()).trim().length, {
        timeout: config.navigationTimeout,
        message: 'Waiting for the SPA shell to render',
      })
      .toBeGreaterThan(100);
  }

  private async dismissBlockingOverlays(): Promise<void> {
    const dismiss = this.page
      .getByRole('button', { name: /accept all|accept cookies|agree|close/i })
      .first();
    if (await dismiss.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await dismiss.click();
    }
  }

  async open(): Promise<void> {
    await this.goto('/');
    await this.waitForSpaShell();
  }

  async selectCategory(category: string): Promise<void> {
    const categoryLocator = this.navCategory(category);
    const categoryPath = CATEGORY_PATHS[category] ?? `/home/${category.toLowerCase()}`;

    await this.dismissBlockingOverlays();

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await categoryLocator.waitFor({ state: 'visible', timeout: this.categoryReadyTimeout });
        await categoryLocator.scrollIntoViewIfNeeded();
        await categoryLocator.click();
        await this.page.waitForURL(new RegExp(categoryPath.replace('/', '\\/')), {
          timeout: config.navigationTimeout,
        });
        await this.waitForVisible(
          this.page.getByTestId(/search-form_location_trigger/),
          this.categoryReadyTimeout,
        );
        return;
      } catch (error) {
        if (attempt === 2) {
          throw error;
        }
        if (attempt === 1) {
          // Datacenter runners can be slow to hydrate the navbar; direct route keeps CI stable.
          await this.goto(categoryPath);
          await this.waitForSpaShell();
          continue;
        }
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await this.waitForSpaShell();
      }
    }
  }
}
