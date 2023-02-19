import type BenchmarkType from 'benchmark';
import _ from 'lodash';

export const Benchmark = (require('benchmark').runInContext({_})) as typeof BenchmarkType;
export type Benchmark = BenchmarkType;
export type BenchmarkStats = BenchmarkType.Stats;
 
(window as any).Benchmark = Benchmark;
