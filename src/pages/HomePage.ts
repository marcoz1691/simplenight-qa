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
    return process.env.CI ? 30_000 : 20_000;
  }

  private get searchWidgetLocator() {
    return this.page.getByTestId(/search-form_location_trigger/);
  }

  private navCategory(name: string) {
    return this.page
      .getByTestId(`navbar-category-${name.toLowerCase()}`)
      .or(this.page.getByRole('link', { name, exact: true }))
      .or(this.page.getByRole('button', { name, exact: true }));
  }

  private async waitForSpaShell(): Promise<void> {
    await expect
      .poll(async () => {
        const text = await this.page.locator('body').innerText();
        if (/403 ERROR|could not be satisfied/i.test(text)) {
          return 0;
        }
        return text.trim().length;
      }, {
        timeout: config.navigationTimeout,
        message: 'Waiting for the SPA shell to render',
      })
      .toBeGreaterThan(100);
  }

  private async waitForHotelsSearchReady(): Promise<void> {
    await this.waitForVisible(this.searchWidgetLocator, this.categoryReadyTimeout);
  }

  private async dismissBlockingOverlays(): Promise<void> {
    const dismiss = this.page
      .getByRole('button', { name: /accept all|accept cookies|agree|close/i })
      .first();
    if (await dismiss.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await dismiss.click();
    }
  }

  private categoryUrlPattern(categoryPath: string): RegExp {
    return new RegExp(categoryPath.replace('/', '\\/'));
  }

  async open(): Promise<void> {
    await this.goto('/');
    if (!process.env.CI) {
      await this.waitForSpaShell();
    }
  }

  async selectCategory(category: string): Promise<void> {
    const categoryPath = CATEGORY_PATHS[category] ?? `/home/${category.toLowerCase()}`;

    await this.dismissBlockingOverlays();

    if (process.env.CI) {
      await this.goto(categoryPath);
      await this.waitForHotelsSearchReady();
      return;
    }

    const categoryLocator = this.navCategory(category);
    await categoryLocator.waitFor({ state: 'visible', timeout: this.categoryReadyTimeout });
    await categoryLocator.scrollIntoViewIfNeeded();
    await categoryLocator.click();
    await this.page.waitForURL(this.categoryUrlPattern(categoryPath), {
      timeout: config.navigationTimeout,
    });
    await this.waitForHotelsSearchReady();
  }
}
