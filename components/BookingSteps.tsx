type Props = {
  current: 1 | 2 | 3 | 4 | 5;
};

const STEPS = ['メニュー', 'スタッフ', '日時', '情報', '確認'];

export default function BookingSteps({ current }: Props) {
  return (
    <div className="bg-white px-3 py-3 border-b overflow-x-auto">
      <div className="flex items-center min-w-[340px]">
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < current;
          const isCurrent = stepNum === current;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isDone
                      ? 'bg-blue-500 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {isDone ? '✓' : stepNum}
                </div>
                <span
                  className={`text-[10px] mt-1 whitespace-nowrap ${
                    isCurrent ? 'text-blue-600 font-bold' : isDone ? 'text-blue-500' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mb-4 mx-1 ${isDone ? 'bg-blue-500' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}