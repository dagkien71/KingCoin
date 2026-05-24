type IMockData = Array<{ time: string; value: number }>;

export function generateData(
  startDate: Date,
  endDate: Date,
  currentPrice: number,
  fluctuationRange: number
): IMockData {
  const data: IMockData = [];
  const currentDate = new Date(startDate);
  let isFirstDataPoint = true; // Đánh dấu thời gian hiện tại

  while (currentDate <= endDate) {
    // Giá trị tại thời gian hiện tại (startDate) phải bằng giá hiện tại
    const value = isFirstDataPoint
      ? currentPrice
      : parseFloat(
          (currentPrice + (Math.random() * 2 - 1) * fluctuationRange).toFixed(2)
        );

    // Thêm dữ liệu vào mảng
    data.push({
      time: currentDate.toISOString().split("T")[0], // Định dạng thành YYYY-MM-DD
      value,
    });

    isFirstDataPoint = false;
    currentDate.setDate(currentDate.getDate() + 1); // Tăng ngày lên 1 ngày
  }

  return data;
}
