#!/usr/bin/env bash

# minimum version required for SIMD: 14.6.0
NODE_VERSION='15.12.0'

. ~/.nvm/nvm.sh
nvm use $NODE_VERSION
if [ "$?" -ne "0" ]; then
    nvm install $NODE_VERSION && nvm use $NODE_VERSION
fi

node --experimental-wasm-simd index.js
