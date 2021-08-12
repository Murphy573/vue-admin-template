#!/usr/bin/env sh

# 当发生错误时中止脚本
set -e

# 获取最近一次commit的提交信息
hash=$(git show -s --format=%H)
author=$(git show -s --format=%cn)
email=$(git show -s --format=%ce)
date=$(git show -s --format=%cd)
subject=$(git show -s --format=%s)
branch=$(git symbolic-ref --short HEAD)

titleStr="#### <font color='warning'>vue-admin-template 有新的提交</font>\n"
branchStr="
> branch: <font color='comment'>$branch</font>"
hashStr="
> hash: <font color='comment'>$hash</font>"
authorStr="
> author: <font color='comment'>$author</font>"
emailStr="
> email: <font color='comment'>$email</font>"
dateStr="
> date: <font color='comment'>$date</font>"
subjectStr="
> message: <font color='comment'>$subject</font>"

markdownContent="$titleStr $branchStr $hashStr $authorStr $emailStr $dateStr $subjectStr"

# 企业微信git_robot通知
curl 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=6c26f990-e24f-4829-9a7f-b0be541ce6f2'\
   -H 'Content-Type: application/json'\
   -d '
   {
        "msgtype": "markdown",
        "markdown": {
            "content": "'"$markdownContent"'"
        }
   }'
