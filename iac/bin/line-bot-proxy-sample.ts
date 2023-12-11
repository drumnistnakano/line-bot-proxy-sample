#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { LineBotProxySampleStack } from "../lib/line-bot-proxy-sample-stack";

const app = new cdk.App();
new LineBotProxySampleStack(app, "LineBotProxySampleStack");
