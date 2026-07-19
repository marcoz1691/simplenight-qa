import { expect, Page } from '@playwright/test';
import { BasePage } from '../BasePage';
import { DateRange, GuestSelection } from '@data/hotel-search.data';

/**
 * SearchWidget models the search bar that appears after selecting a category
 * (Location / Dates / Guests / Search button). It's implemented as a
 * component rather than a page because the same widget shape is reused
 * across every vertical (Hotels, Flights, Cars, etc.) per the assignment's
 * requirement to structure the framework for "any category," not just Hotels.
 */
export class SearchWidget extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get locationTrigger() {
    return this.page.getByTestId(/search-form_location_trigger/);
  }

  private get datesTrigger() {
    return this.page
      .getByTestId(/search-form_dates_trigger/)
      .or(this.page.getByTestId('search-dates-input'))
      .or(this.page.getByRole('textbox', { name: /^dates$/i }));
  }

  private get guestsTrigger() {
    return this.page
      .getByTestId(/search-form_guests_trigger/)
      .or(this.page.getByTestId('search-guests-input'))
      .or(this.page.getByRole('textbox', { name: /travelers/i }));
  }

  private get searchButton() {
    return this.page
      .getByTestId(/search-form_search-button/)
      .or(this.page.getByTestId('search-submit-button'))
      .or(this.page.getByRole('button', { name: /^search$/i }));
  }

  private guestDialog() {
    return this.page.getByRole('dialog').last();
  }

  private formatCalendarLabel(isoDate: string): string {
    const date = new Date(`${isoDate}T12:00:00`);
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  }

  private dayCell(isoDate: string) {
    const label = this.formatCalendarLabel(isoDate);
    return this.page.getByRole('button', { name: label, exact: true });
  }

  async setLocation(location: string): Promise<void> {
    await this.waitForVisible(this.locationTrigger);

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.locationTrigger.click();

      const dialog = this.page.getByRole('dialog');
      const searchInput = dialog.getByRole('textbox');

      try {
        await expect(searchInput).toBeVisible({ timeout: 5_000 });
        await searchInput.fill(location);

        const option = dialog.getByRole('option', { name: new RegExp(location, 'i') }).first();
        await expect
          .poll(async () => option.count(), {
            message: 'Waiting for location autocomplete suggestions',
            timeout: 20_000,
          })
          .toBeGreaterThan(0);

        await option.click();
        return;
      } catch (error) {
        await this.page.keyboard.press('Escape');
        if (attempt === 2) {
          throw error;
        }
      }
    }
  }

  async setDateRange(range: DateRange): Promise<void> {
    await this.datesTrigger.click();
    const checkIn = this.dayCell(range.checkIn);
    await this.waitForVisible(checkIn);
    await checkIn.click();
    const checkOut = this.dayCell(range.checkOut);
    await this.waitForVisible(checkOut);
    await checkOut.click();
    await this.page.keyboard.press('Escape');
  }

  async setGuests(guests: GuestSelection): Promise<void> {
    await this.guestsTrigger.click();
    const guestDialog = this.guestDialog();
    await this.waitForVisible(guestDialog);

    for (let i = 0; i < guests.children; i++) {
      await guestDialog.getByRole('button', { name: 'Add Child' }).click();
    }

    if (guests.children > 0 && guests.childAge !== undefined) {
      const ageTrigger = guestDialog.getByRole('textbox', { name: /child 1 age/i });
      await ageTrigger.click();
      const ageOption = this.page
        .getByRole('option', { name: String(guests.childAge), exact: true })
        .or(this.page.getByRole('button', { name: String(guests.childAge), exact: true }));
      await this.waitForVisible(ageOption.first());
      await ageOption.first().click();
    }

    await this.page.keyboard.press('Escape');
  }

  async submitSearch(): Promise<void> {
    await this.searchButton.click();
    await this.page.waitForURL(/\/search\//, { timeout: 60_000 });
    await this.waitForVisible(this.page.getByText(/Showing .* Properties/i), 90_000);
  }

  /** Convenience method that fills the full widget in one call. */
  async search(params: { location: string; dates: DateRange; guests: GuestSelection }): Promise<void> {
    await this.setLocation(params.location);
    await this.setDateRange(params.dates);
    await this.setGuests(params.guests);
    await this.submitSearch();
  }
}
