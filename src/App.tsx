import { useState, useEffect, useRef } from 'react';
import './App.css';
import OptionDetails from './OptionDetails';
import ChartComponent from './ChartComponent';
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { Toaster, toast } from 'react-hot-toast';

interface Option {
  contractSymbol: string;
  lastTradeDate: number;
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  change: number;
  percentChange: number;
  volume?: number;
  openInterest: number;
  impliedVolatility: number;
  inTheMoney: boolean;
}

function App() {
  const [apiData, setApiData] = useState<string>("Using OpenAI's 3.5 Turbo Instruct Model to generate company summaries. Enjoy!");
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [callsData, setCallsData] = useState<Option[]>([]);
  const [putsData, setPutsData] = useState<Option[]>([]);
  const [numberOfOptions, setNumberOfOptions] = useState<string>('5');
  const [typeOfOptions, setTypeOfOptions] = useState<string>('calls');
  const [expirationDates, setExpirationDates] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [askPrice, setAskPrice] = useState<number | null>(null);
  const [previousAskPrice, setPreviousAskPrice] = useState<number | null>(null);
  const [priceColor, setPriceColor] = useState<string>('text-white');
  const [selectedContractSymbol, setSelectedContractSymbol] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    retrieveDataFromStorage(['apiData', 'callsData', 'putsData', 'ticker', 'selectedDate', 'askPrice', 'expirationDates'], (result: { [key: string]: any }) => {
      if (result.apiData) setApiData(result.apiData);
      if (result.callsData) setCallsData(JSON.parse(result.callsData));
      if (result.putsData) setPutsData(JSON.parse(result.putsData));
      if (result.ticker) setCustomPrompt(result.ticker);
      if (result.selectedDate) setSelectedDate(result.selectedDate);
      if (result.askPrice) {
        setPreviousAskPrice(result.askPrice);
        setAskPrice(result.askPrice);
      }
      if (result.expirationDates) {
        setExpirationDates(JSON.parse(result.expirationDates));
      }
    });

    // Listen for incoming messages
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'DISPLAY_DATA') {
        const data = message.data;
        setApiData(data.apiData);
        setCallsData(JSON.parse(data.callsData));
        setPutsData(JSON.parse(data.putsData));
        setCustomPrompt(data.ticker);
        setSelectedDate(data.selectedDate);
        setPreviousAskPrice(data.askPrice);
        setAskPrice(data.askPrice);
        setExpirationDates(JSON.parse(data.expirationDates));
      }
    });

    //reset badge
    chrome.action.setBadgeText({"text": ""}); 
  }, []);

  useEffect(() => {
    if (selectedContractSymbol && chartRef.current) {
      chartRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedContractSymbol]);

  const retrieveDataFromStorage = (keys: string[], callback: (result: { [key: string]: any }) => void) => {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(keys, callback);
    } else {
      console.error('chrome.storage.local is not defined');
    }
  };

  const storeDataInStorage = (data: { [key: string]: any }, callback: () => void) => {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(data, callback);
    } else {
      console.error('chrome.storage.local is not defined');
    }
  };

  const handleSubmit = async () => {
    const toastId = toast.loading('Loading...'); // Show toaster

    try {
        const openAiData = await fetchOpenAiData(customPrompt);
        setApiData(openAiData);
        storeDataInStorage({ apiData: openAiData, ticker: customPrompt }, () => {
            console.log('API data stored in chrome.storage');
        });

        const expirationDates = await fetchExpirationDates(customPrompt);
        if (expirationDates.length > 0) {
            setSelectedDate(expirationDates[0]);
            storeDataInStorage({ selectedDate: expirationDates[0] }, () => {
                console.log('Selected date stored in chrome.storage');
            });
            await fetchOptionsData(expirationDates[0]);
        }

        toast.success('Data loaded successfully!', { id: toastId }); // Success notification
    } catch (error) {
        console.error(error);
        toast.error('Failed to load data.', { id: toastId }); // Error notification
    } finally {
    }
  };

  const fetchOpenAiData = async (prompt: string): Promise<string> => {
    const apiKey = "sk-proj-xGeorjPeEbFH5GnFtKN2T3BlbkFJbIoAmXwghFY5eE5oCcS3";
    const url = 'https://api.openai.com/v1/completions';

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        "model": "gpt-3.5-turbo-instruct",
        "prompt": "create a company summary for this ticker in two sentences (write the name of company first): " + prompt,
        "max_tokens": 100,
        "temperature": 0,
      }),
    });

    const data = await response.json();
    return data.choices[0].text;
  };

  const fetchOptionsData = async (expirationDate: number) => {
    const response = await fetch(`https://yfapi.net/v7/finance/options/${customPrompt}?date=${expirationDate}`, {
      headers: {
        'accept': 'application/json',
        'X-API-KEY': 'k2PWb6dexI963XCbiFOvd1dIzui1NKUJaRMs5RLf'
      }
    });

    const financeData = await response.json();
    const calls = financeData.optionChain.result[0].options[0].calls;
    const puts = financeData.optionChain.result[0].options[0].puts;
    const askPrice = financeData.optionChain.result[0].quote.regularMarketPrice;

    if (previousAskPrice !== null) {
      if (askPrice > previousAskPrice) {
        setPriceColor('text-green-500');
      } else if (askPrice < previousAskPrice) {
        setPriceColor('text-red-500');
      } else {
        setPriceColor('text-white');
      }
      setTimeout(() => setPriceColor('text-white'), 500); // Revert to white after 500ms
    }

    setPreviousAskPrice(askPrice);
    setCallsData(calls);
    setPutsData(puts);
    setAskPrice(askPrice);

    storeDataInStorage({ 
      callsData: JSON.stringify(calls), 
      putsData: JSON.stringify(puts),
      askPrice: askPrice 
    }, () => {
      console.log('Finance data and ask price stored in chrome.storage');
    });
  };

  const fetchExpirationDates = async (ticker: string) => {
    if (!ticker) return [];

    const response = await fetch(`https://yfapi.net/v7/finance/options/${ticker}`, {
      headers: {
        'accept': 'application/json',
        'X-API-KEY': 'k2PWb6dexI963XCbiFOvd1dIzui1NKUJaRMs5RLf'
      }
    });

    const financeData = await response.json();
    const dates = financeData.optionChain.result[0].expirationDates;
    setExpirationDates(dates);
    storeDataInStorage({ expirationDates: JSON.stringify(dates) }, () => {
      console.log('Expiration dates stored in chrome.storage');
    });
    return dates;
  };

  const handleNumberOfOptionsChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setNumberOfOptions(event.target.value);
  };

  const handleTypeOfOptionsChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeOfOptions(event.target.value);
  };

  const handleDateChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDate = parseInt(event.target.value);
    setSelectedDate(selectedDate);
    storeDataInStorage({ selectedDate: selectedDate }, () => {
      console.log('Selected date stored in chrome.storage');
    });
    await fetchOptionsData(selectedDate);
  };

  const handleRefresh = async () => {
    if (selectedDate !== null) {
      await fetchOptionsData(selectedDate);
    }
  };

  const getFilteredOptions = (): Option[] => {
    const data = typeOfOptions === 'calls' ? callsData : putsData;
    const numOptions = numberOfOptions === 'all' ? data.length : parseInt(numberOfOptions, 10);
    const inTheMoneyOptions = data.filter(option => option.inTheMoney);
    const outOfTheMoneyOptions = data.filter(option => !option.inTheMoney);

    if (typeOfOptions === 'calls') {
      return [
        ...inTheMoneyOptions.slice(inTheMoneyOptions.length - (numberOfOptions === 'all' || inTheMoneyOptions.length < numOptions ? inTheMoneyOptions.length : numOptions), inTheMoneyOptions.length),
        ...outOfTheMoneyOptions.slice(0, numOptions)
      ];
    } else {
      return [
        ...outOfTheMoneyOptions.slice(outOfTheMoneyOptions.length - (numberOfOptions === 'all' || outOfTheMoneyOptions.length < numOptions? outOfTheMoneyOptions.length : numOptions), outOfTheMoneyOptions.length),
        ...inTheMoneyOptions.slice(0, numOptions)
      ];
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date((timestamp + 86400) * 1000);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleContractSymbolClick = (contractSymbol: string) => {
    setSelectedContractSymbol(contractSymbol);
  };  

  return (
    <div className="container p-4 pt-4 mx-auto bg-gray-900 min-w-[320px]">
      {askPrice !== null && (
        <div className="flex items-center mb-4 text-2xl font-light">
          <p className={`text-left ${priceColor} transition-colors duration-500`}>{askPrice.toFixed(2)} USD</p>
          <ArrowPathIcon 
            onClick={handleRefresh} 
            className="ml-2 p-1 size-9 bg-gray-700 text-white cursor-pointer rounded-full transform transition-transform duration-500 hover:rotate-180" 
          />
        </div>
      )}
      <Toaster/>
      <div className="mb-4 flex justify-center items-center">
        <div className='flex justify-center border border-gray-300 rounded-xl bg-gray-700'>
          <input 
            type="text" 
            placeholder="Enter your ticker" 
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.currentTarget.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            className="p-2 px-4 text-white bg-gray-700 rounded-xl outline-none"
          />
          <MagnifyingGlassIcon 
            onClick={handleSubmit} 
            className="p-2 size-9 bg-gray-700 text-white cursor-pointer rounded-xl" 
          />
        </div>
      </div>
      <p className="mb-4 mx-16 text-white text-left">
        <b>AI Summary:</b> {apiData}
      </p>
      {callsData.length > 0 ? (
        <div>
          <div className="mb-4 flex space-x-4">
            <select 
              value={selectedDate ?? (expirationDates.length > 0 ? expirationDates[0] : '')}
              onChange={handleDateChange}
              className="border border-gray-300 p-2 mt-1 block w-full rounded-2xl text-white bg-gray-700 hover:bg-gray-600"
            >
              {expirationDates.map((date) => (
                <option key={date} value={date}>{formatDate(date)}</option>
              ))}
            </select>
            <select 
              id="numberOfOptions" 
              value={numberOfOptions} 
              onChange={handleNumberOfOptionsChange} 
              className="border border-gray-300 p-2 mt-1 block w-full rounded-2xl text-white bg-gray-700 hover:bg-gray-600"
            >
              <option value="5">10 Strike Prices</option>
              <option value="10">20</option>
              <option value="all">All</option>
            </select>
            <select 
              id="typeOfOptions" 
              value={typeOfOptions} 
              onChange={handleTypeOfOptionsChange}
              className="border border-gray-300 p-2 mt-1 block w-full rounded-2xl text-white bg-gray-700 hover:bg-gray-600"
            >
              <option value="calls">Calls</option>
              <option value="puts">Puts</option>
            </select>
          </div>
          <OptionDetails options={getFilteredOptions()} onContractSymbolClick={handleContractSymbolClick} />
        </div>
      ) : (
        <div>
          <p className="text-white font-bold text-lg">Search For a Stock!</p>
          <p className="text-white">TSLA, AAPL, MSFT, META, GOOG, GME, SPY</p>
        </div>
      )}
      {/* Render the separate component for the chart using selectedContractSymbol */}
      {selectedContractSymbol && (
        <div ref={chartRef}>
          <ChartComponent contractSymbol={selectedContractSymbol} />
        </div>
      )}
    </div>
  );  
}

export default App;