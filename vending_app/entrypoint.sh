#/bin/bash
export EXPO_TOKEN=X5WFQ_MO2VV-d5fQpiC66OCqcIOzdGp9HQR7S9Bq;
export EAS_NO_VCS=1

yarn install;

case $1 in

build-p)
    eas build --local --platform android --output "./apks/build.aab" --profile production && \
    cd ./apks && \
    java -jar bundletool.jar build-apks \
        --bundle=build.aab \
        --output=$2.apks \
        --mode=universal \
        --ks=./@froty__moaddi-app.jks \
        --ks-pass=pass:64f88e33f6a1e25d117cba5544d81af2 \
        --ks-key-alias=f5a7782b016d29003ff2e43dd6ef4227 \
        --key-pass=pass:09289cec3941955883f8145689435f87 && \
    unzip $2.apks && \
    mv universal.apk /public/$2.apk && \
    rm toc.pb $2.apks 
  ;;

# https://expo.dev/artifacts/eas/ddmD64atQUxw5xqnu1t9Mf.ipa
build-ios-p)
    eas build --platform ios --profile production
  ;;

submit-ios)
    eas submit --platform ios
  ;;

build-submit-ios)
    eas build --platform ios && \
    eas submit --platform ios
  ;;

build-d)
    eas build --local --platform android --output "./apks/debug.apk" --profile development && \
    mv ./apks/debug.apk /public/debug.apk
  ;;

dev)
  yarn dev:tunnel
  ;;

esac
