#!/bin/bash

cd /home/ec2-user/app

aws ecr get-login-password --region us-west-2 \
| docker login --username AWS \
--password-stdin 689916825005.dkr.ecr.us-west-2.amazonaws.com
