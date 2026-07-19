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
  }

  async selectCategory(category: string): Promise<void> {
    const categoryLocator = this.navCategory(category);
    await this.waitForVisible(categoryLocator);
    await categoryLocator.click();
    await this.page.waitForURL(/\/home\/hotels/, { timeout: 15_000 });
    await this.waitForVisible(this.page.getByTestId(/search-form_location_trigger/));
  }
}
