chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FETCH_DATA") {

    const ticker = request.prompt;
    const openAiApiKey = request.apiKey;
    const yahooApiKey = "k2PWb6dexI963XCbiFOvd1dIzui1NKUJaRMs5RLf";

    // Fetch data from OpenAI API
    fetch('https://api.openai.com/v1/completions', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        "model": "gpt-3.5-turbo-instruct",
        "prompt": "create a company summary for this ticker in two sentences (state the name of company first): " + ticker,
        "max_tokens": 100,
        "temperature": 0,
      }),
    })
    .then(response => response.json())
    .then(data => {
      const apiData = data.choices[0].text;

      // Fetch expiration dates from Yahoo Finance API
      fetch(`https://yfapi.net/v7/finance/options/${ticker}`, {
        headers: {
          'accept': 'application/json',
          'X-API-KEY': yahooApiKey
        }
      })
      .then(response => response.json())
      .then(data => {
        const expirationDates = data.optionChain.result[0].expirationDates;
        if (expirationDates.length > 0) {
          const firstExpirationDate = expirationDates[0];

          // Fetch options data for the first expiration date from Yahoo Finance API
          fetch(`https://yfapi.net/v7/finance/options/${ticker}?date=${firstExpirationDate}`, {
            headers: {
              'accept': 'application/json',
              'X-API-KEY': yahooApiKey
            }
          })
          .then(response => response.json())
          .then(data => {
            const calls = data.optionChain.result[0].options[0].calls;
            const puts = data.optionChain.result[0].options[0].puts;
            const askPrice = data.optionChain.result[0].quote.regularMarketPrice;

            // Store data in Chrome storage
            const result = {
              apiData: apiData,
              callsData: JSON.stringify(calls),
              putsData: JSON.stringify(puts),
              ticker: ticker.toUpperCase(),
              selectedDate: firstExpirationDate,
              askPrice: askPrice,
              expirationDates: JSON.stringify(expirationDates)
            };

            chrome.storage.local.set(result, () => {
              sendResponse({ result });
                //badges/notification
                chrome.action.setBadgeText({"text": "new"}); 
                chrome.action.setBadgeBackgroundColor({"color": '#00FF00'})
                chrome.action.setBadgeTextColor({"color": '#FFFFFF'})
            });
          })
          .catch(error => sendResponse({ error: error.toString() }));
        } else {
          sendResponse({ error: "No expiration dates found" });
        }
      })
      .catch(error => sendResponse({ error: error.toString() }));
    })
    .catch(error => sendResponse({ error: error.toString() }));

    return true; // Keeps the messaging channel open for sendResponse
  }
});
