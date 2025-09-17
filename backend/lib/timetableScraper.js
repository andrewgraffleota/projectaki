// backend/lib/timetableScraper.js
const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');
const { wrapper } = require('axios-cookiejar-support');
const tough = require('tough-cookie');

class TimetableScraper {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || process.env.TIMETABLE_BASE_URL;
    // axios instance that keeps cookies across requests
    this.jar = new tough.CookieJar();
    this.client = wrapper(axios.create({ jar: this.jar, withCredentials: true }));
  }

  // GET the main page and return viewstate & eventvalidation
  async fetchFormFields() {
    const res = await this.client.get(`${this.baseUrl}/Default.aspx`);
    const $ = cheerio.load(res.data);
    return {
      __VIEWSTATE: $('input[name="__VIEWSTATE"]').val() || '',
      __EVENTVALIDATION: $('input[name="__EVENTVALIDATION"]').val() || '',
      // Some sites also have __VIEWSTATEGENERATOR
      __VIEWSTATEGENERATOR: $('input[name="__VIEWSTATEGENERATOR"]').val() || ''
    };
  }

  // perform the search POST and parse results
  async searchProgrammes(searchTerm) {
    try {
      const fields = await this.fetchFormFields();

      const formData = {
        '__VIEWSTATE': fields.__VIEWSTATE,
        '__VIEWSTATEGENERATOR': fields.__VIEWSTATEGENERATOR,
        '__EVENTVALIDATION': fields.__EVENTVALIDATION,
        'ctl00$ContentPlaceHolder1$txtSearch': searchTerm,
        'ctl00$ContentPlaceHolder1$btnSearch': 'Search'
      };

      // send as form urlencoded
      const res = await this.client.post(
        `${this.baseUrl}/Default.aspx`,
        qs.stringify(formData),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      return this.parseSearchResults(res.data);
    } catch (err) {
      console.error('Scrape error:', err.message);
      return [];
    }
  }

  // Parse search result HTML into structured JSON.
  // This is generic — inspect the actual table and adjust selectors if needed.
  parseSearchResults(html) {
    const $ = cheerio.load(html);
    const results = [];

    // Try to find a table of results — this selector may need tailoring.
    // Inspect the live page to find the table id/class (use devtools).
    const rows = $('table').first().find('tbody tr');

    rows.each((i, tr) => {
      const cells = $(tr).find('td').map((i, td) => $(td).text().trim()).get();
      if (cells.length < 3) return; // skip garbage rows

      // heuristics: map columns to fields - adjust order to match site
      results.push({
        programme_code: cells[0] || '',
        programme_name: cells[1] || cells[0] || '',
        day: cells[2] || '',
        time: cells[3] || '',
        room: cells[4] || '',
        lecturer: cells[5] || '',
        campus: cells[6] || ''
      });
    });

    return results;
  }
}

module.exports = TimetableScraper;
