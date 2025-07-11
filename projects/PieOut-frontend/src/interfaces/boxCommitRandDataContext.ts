import { MutableRefObject } from 'react'
import { BoxCommitRandDataType } from '../types/boxCommitRandDataType'

export interface BoxCommitRandDataContextInterface {
  boxCommitRandRef: MutableRefObject<BoxCommitRandDataType>
  boxCommitRandData: BoxCommitRandDataType
  setBoxCommitRandData: (entry: BoxCommitRandDataType) => void
  getBoxCommitRandData: () => BoxCommitRandDataType
  // isLoading: boolean
}
