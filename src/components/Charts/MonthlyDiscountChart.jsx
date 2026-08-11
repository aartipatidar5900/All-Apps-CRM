import StoreStatusChart from './StoreStatusChart';
import DiscountCreationChart from './DiscountCreationChart';
import { mockMonthlyTrends } from '../../data/mockData';

const MonthlyDiscountChart = () => {
  const loading = false;
  const error = '';
  const data = mockMonthlyTrends;

  return (
    <div className="mb-6">
      <StoreStatusChart data={data} loading={loading} error={error} />
      <DiscountCreationChart data={data} loading={loading} error={error} />
    </div>
  );
};

export default MonthlyDiscountChart;
