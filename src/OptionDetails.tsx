import React from 'react';

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

interface OptionDetailsProps {
  options: Option[];
  onContractSymbolClick: (contractSymbol: string) => void;  // Add callback prop
}

const OptionDetails: React.FC<OptionDetailsProps> = ({ options, onContractSymbolClick }) => {
  const headers = [
    "contractSymbol",
    "strike",
    "lastPrice",
    "bid",
    "ask",
    "change",
    "percentChange",
    "volume",
    "openInterest",
    "impliedVolatility",
    "lastTradeDate",
  ];

  const formatValue = (key: string, value: any) => {
    switch (key) {
      case 'lastTradeDate':
        return new Date(value * 1000).toLocaleDateString() + " " + new Date(value * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'volume':
      case 'openInterest':
        return value !== undefined ? value.toFixed(0) : 'N/A';
      case 'lastPrice':
      case 'bid':
      case 'ask':
        return value !== undefined ? value.toFixed(2) : 'N/A';
      case 'change':
        return value !== undefined ? value.toFixed(2) : 'N/A';
      case 'percentChange':
        return value !== undefined ? `${value.toFixed(2)}%` : 'N/A';
      case 'impliedVolatility':
        return value !== undefined ? `${(value * 100).toFixed(2)}%` : 'N/A';
      default:
        return value !== undefined ? value : 'N/A';
    }
  };

  const getColorClass = (key: string, value: number) => {
    if (key === 'change' || key === 'percentChange') {
      return value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : '';
    }
    return '';
  };

  return (
    <div className="option-details">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((key) => (
                <th
                  key={key}
                  className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {options.map((option, index) => (
              <tr
                key={index}
                className={option.inTheMoney ? 'bg-blue-100' : 'bg-white'}
              >
                {headers.map((key) => (
                  <td
                    key={key}
                    className={`px-3 py-2 whitespace-nowrap text-xs text-gray-700 border-b border-gray-200 ${getColorClass(key, option[key as keyof Option] as number)} ${key === 'contractSymbol' ? 'cursor-pointer' : ''}`}
                    onClick={key === 'contractSymbol' ? () => onContractSymbolClick(option.contractSymbol) : undefined}  // Trigger callback only for contractSymbol
                  >
                    {formatValue(key, option[key as keyof Option])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OptionDetails;
