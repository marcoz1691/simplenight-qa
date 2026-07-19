import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { SearchWidget } from './components/SearchWidget';

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

  private navCategory(name: string) {
    // data-testid is preferred (stable across copy/style changes); role-based
    // text match is the fallback if the app doesn't expose test ids.
    return this.page
      .getByTestId(`navbar-category-${name.toLowerCase()}`)
      .or(this.page.getByRole('link', { name, exact: true }))
      .or(this.page.getByRole('button', { name, exact: true }));
  }

  async open(): Promise<void> {
    await this.goto('/');
    await this.page.waitForLoadState('load');
    // SPAs may never reach networkidle (background polling); best-effort only.
    await this.page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
  }

  async selectCategory(category: string): Promise<void> {
    const categoryLocator = this.navCategory(category);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await categoryLocator.waitFor({ state: 'visible', timeout: 20_000 });
        await categoryLocator.scrollIntoViewIfNeeded();
        await categoryLocator.click();
        await this.page.waitForURL(/\/home\/hotels/, { timeout: 30_000 });
        await this.waitForVisible(this.page.getByTestId(/search-form_location_trigger/), 20_000);
        return;
      } catch (error) {
        if (attempt === 1) {
          throw error;
        }
        await this.page.reload({ waitUntil: 'load' });
      }
    }
  }
}
