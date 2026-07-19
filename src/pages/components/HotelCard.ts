import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export interface HotelCardValues {
  price: number;
  guestScore: number;
  guestScoreLabel: string;
}

/**
 * HotelCard represents the hotel card shown in the results list (highlighted
 * after selecting a map pin). Exposes typed getters so the spec can assert on
 * plain numbers/strings instead of parsing raw text itself.
 */
export class HotelCard extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get root() {
    return this.page
      .getByTestId('hotel-card')
      .or(this.page.locator('[data-component="hotel-card"]'))
      .or(this.page.locator('div').filter({ hasText: /Includes Taxes and Fees/i }).first());
  }

  async waitUntilVisible(): Promise<void> {
    const timeout = process.env.CI ? 60_000 : 30_000;
    await this.waitForVisible(this.root, timeout);
  }

  async getValues(): Promise<HotelCardValues> {
    const text = await this.root.innerText();
    const priceMatch = text.match(/Total\s*\n?\s*\$(\d+(?:,\d+)?)/i);

    const labelFirst = text.match(/(Excellent|Very Good|Good|Average)\s*\n?\s*(\d+(?:\.\d+)?)/i);
    const scoreFirst = text.match(/(\d+(?:\.\d+)?)\s*\n?\s*(Excellent|Very Good|Good|Average)/i);

    if (!priceMatch) {
      throw new Error(`Could not parse hotel price from card text:\n${text}`);
    }

    let guestScore: number;
    let guestScoreLabel: string;

    if (labelFirst) {
      guestScoreLabel = labelFirst[1];
      guestScore = Number(labelFirst[2]);
    } else if (scoreFirst) {
      guestScore = Number(scoreFirst[1]);
      guestScoreLabel = scoreFirst[2];
    } else {
      throw new Error(`Could not parse guest score from card text:\n${text}`);
    }

    return {
      price: Number(priceMatch[1].replace(/,/g, '')),
      guestScore,
      guestScoreLabel,
    };
  }
}
