export enum DataRetentionPeriod {
  SIX_MONTHS = '6_months',
  ONE_YEAR = '1_year',
  TWO_YEARS = '2_years',
  THREE_YEARS = '3_years',
}

export const DATA_RETENTION_PERIOD_LABELS: Record<DataRetentionPeriod, string> =
  {
    [DataRetentionPeriod.SIX_MONTHS]: '6 months',
    [DataRetentionPeriod.ONE_YEAR]: '1 year',
    [DataRetentionPeriod.TWO_YEARS]: '2 years',
    [DataRetentionPeriod.THREE_YEARS]: '3 years',
  };

export const DATA_RETENTION_PERIODS: DataRetentionPeriod[] =
  Object.values(DataRetentionPeriod);
