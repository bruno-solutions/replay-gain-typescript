import {square} from './square';

// throws when the array is null, undefined, or empty

export function rootMeanSquare(array: number[]): number {
  return array.reduce((sum: number, value: number) => sum + square(value), 0) / array.length;
}
