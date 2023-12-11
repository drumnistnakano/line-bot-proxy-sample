import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import { Construct } from 'constructs'

/**
 * Nodejs Lambda関数パラメータ デフォルト設定値
 */
export const nodejsFnPropsDefault: lambdaNodejs.NodejsFunctionProps = {
  runtime: lambda.Runtime.NODEJS_20_X,
  environment: {},
  tracing: lambda.Tracing.ACTIVE,
  timeout: cdk.Duration.seconds(15),
  memorySize: 512,
  bundling: {
    sourceMap: true,
  },
  architecture: lambda.Architecture.ARM_64,
}

/**
 * Nodejs Lambda関数を作成する
 *
 * @param {{construct: Construct; nodejsFnId: string; nodejsFnProps: lambdaNodejs.NodejsFunctionProps}} params パラメータ
 */
export const createNodejsFn = ({
  construct,
  nodejsFnId,
  nodejsFnProps,
}: {
  construct: Construct
  nodejsFnId: string
  nodejsFnProps: lambdaNodejs.NodejsFunctionProps
}): {
  nodejsFn: lambdaNodejs.NodejsFunction
} => {
  const nodejsFn = new lambdaNodejs.NodejsFunction(
    construct,
    nodejsFnId,
    nodejsFnProps
  )
  return { nodejsFn }
}
