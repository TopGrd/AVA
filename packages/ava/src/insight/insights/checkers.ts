import { intersection } from 'lodash';

import { Datum, SubjectInfo, InsightType, DataProperty } from '../types';
import { NumberFieldInfo } from '../../data';

import type { LevelOfMeasurement } from '../../ckb';

export type ExtractorChecker = (
  data: Datum[],
  subjectInfo: SubjectInfo,
  fieldPropsMap: Record<string, DataProperty>,
  lom?: LevelOfMeasurement | LevelOfMeasurement[]
) => boolean;

const fieldsQuantityChecker = (subjectInfo: SubjectInfo, dimensionsQuantity: number, measuresQuantity: number) => {
  const { dimensions, measures } = subjectInfo;
  if (dimensions.length === dimensionsQuantity && measures.length === measuresQuantity) return true;
  return false;
};

const generalCheckerFor1M1D: ExtractorChecker = (data, subjectInfo, fieldPropsMap, lom) => {
  const { dimensions } = subjectInfo;
  // check data length
  if (data?.length < 3) return false;
  // check field quantity
  if (!fieldsQuantityChecker(subjectInfo, 1, 1)) return false;
  // check dimension type
  if (
    Array.isArray(lom)
      ? !intersection(fieldPropsMap[dimensions[0]]?.levelOfMeasurements, lom as LevelOfMeasurement[])?.length
      : !fieldPropsMap[dimensions[0]]?.levelOfMeasurements?.includes(lom as LevelOfMeasurement)
  )
    return false;
  return true;
};

export const trendChecker: ExtractorChecker = (data, subjectInfo, fieldPropsMap) => {
  return generalCheckerFor1M1D(data, subjectInfo, fieldPropsMap, 'Time');
};

export const categoryOutlierChecker: ExtractorChecker = (data, subjectInfo, fieldPropsMap) => {
  return generalCheckerFor1M1D(data, subjectInfo, fieldPropsMap, ['Nominal', 'Discrete', 'Ordinal']);
};

export const changePointChecker: ExtractorChecker = (data, subjectInfo, fieldPropsMap) => {
  return generalCheckerFor1M1D(data, subjectInfo, fieldPropsMap, 'Time');
};

export const timeSeriesChecker: ExtractorChecker = (data, subjectInfo, fieldPropsMap) => {
  return generalCheckerFor1M1D(data, subjectInfo, fieldPropsMap, 'Time');
};

export const majorityChecker: ExtractorChecker = (data, subjectInfo, fieldPropsMap) => {
  if (!generalCheckerFor1M1D(data, subjectInfo, fieldPropsMap, ['Nominal', 'Discrete', 'Ordinal', 'Time']))
    return false;
  const { measures } = subjectInfo;
  if (!['count', 'sum'].includes(measures[0].method)) return false;
  return true;
};

export const lowVarianceChecker: ExtractorChecker = (data, subjectInfo, fieldPropsMap) => {
  if (!generalCheckerFor1M1D(data, subjectInfo, fieldPropsMap, ['Nominal', 'Discrete', 'Ordinal'])) return false;
  const { measures } = subjectInfo;
  // 低方差检验使用变异系数 sigma/mean 作为检验统计量，要求均值不能为0
  if (['float', 'integer'].includes(fieldPropsMap[measures[0].fieldName].recommendation)) {
    return (fieldPropsMap[measures[0].fieldName] as NumberFieldInfo).mean !== 0;
  }
  return false;
};

export const correlationChecker: ExtractorChecker = (data, subjectInfo, fieldPropsMap) => {
  const { measures } = subjectInfo;
  // check data length
  if (data?.length < 3) return false;
  // check field quantity
  if (measures.length !== 2) return false;
  if (
    !fieldPropsMap[measures[0].fieldName].levelOfMeasurements?.includes('Continuous') ||
    !fieldPropsMap[measures[1].fieldName].levelOfMeasurements?.includes('Continuous')
  )
    return false;
  return true;
};

export const ExtractorCheckers: Partial<Record<InsightType, ExtractorChecker>> = {
  category_outlier: categoryOutlierChecker,
  trend: trendChecker,
  change_point: changePointChecker,
  time_series_outlier: timeSeriesChecker,
  low_variance: lowVarianceChecker,
  correlation: correlationChecker,
};
