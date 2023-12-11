import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'

export interface CreateDdbTablesProps {
  construct: Construct
}

export interface CreateDdbTablesResult {
  lineUsersTable: dynamodb.Table
}

/**
 * DynamoDBテーブルを作成
 *
 * @param {CreateDdbTablesProps} params パラメータ
 * @returns {CreateDdbTablesResult} DynamoDBテーブル
 */
export const createDdbTables = ({
  construct,
}: CreateDdbTablesProps): CreateDdbTablesResult => {
  /**
   * LINEユーザテーブル
   */
  const lineUsersTable = new dynamodb.Table(construct, 'lineUsersTable', {
    tableName: 'lineUsers',
    partitionKey: {
      name: 'lineUserId',
      type: dynamodb.AttributeType.STRING,
    },
    pointInTimeRecovery: true,
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    removalPolicy: cdk.RemovalPolicy.RETAIN,
  })

  return {
    lineUsersTable,
  }
}
