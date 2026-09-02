import Papa from 'papaparse';

describe('CSV Parsing Tests', () => {
  test('should handle quoted fields containing commas', () => {
    const csv = `paymentId,merchantId,customerId,amount,method\nPAY-001,"MER-001, Inc.",CUST-1001,10000.00,upi`;
    const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
    expect(result.data[0]).toEqual({
      paymentId: 'PAY-001',
      merchantId: 'MER-001, Inc.',
      customerId: 'CUST-1001',
      amount: '10000.00',
      method: 'upi'
    });
  });

  test('should handle empty rows gracefully', () => {
    const csv = `paymentId,amount\nPAY-001,1000\n\nPAY-002,2000`;
    const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
    expect(result.data).toHaveLength(2);
  });
});
