#!/bin/sh

(cd thrush-frontend && ng build)
(cd thrush-docs && npm run build)

tar -czf thrush.tgz thrush-frontend/dist thrush-docs/build