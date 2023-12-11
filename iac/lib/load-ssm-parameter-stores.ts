import * as ssm from 'aws-cdk-lib/aws-ssm'
import { Construct } from 'constructs'

export interface LoadSsmParameterStoresProps {
  construct: Construct
}
export interface LoadSsmParameterStoresResult {
  lineChannelAccessToken: string
  lineChannelSecret: string
}

/**
 * SSMパラメータストアを取得
 *
 * @param {LoadSsmParameterStoresProps} params パラメータ
 * @returns {LoadSsmParameterStoresResult} パラメータストアの値
 */
export const loadSsmParameterStores = ({
  construct,
}: LoadSsmParameterStoresProps): LoadSsmParameterStoresResult => {
  const lineChannelAccessToken = ssm.StringParameter.valueForStringParameter(
    construct,
    'lineChannelAccessToken'
  )
  const lineChannelSecret = ssm.StringParameter.valueForStringParameter(
    construct,
    'lineChannelSecret'
  )
  return {
    lineChannelAccessToken,
    lineChannelSecret,
  }
}
