#!groovy

// https://github.com/feedhenry/fh-pipeline-library
@Library('fh-pipeline-library') _

String fhMessagingVersion = ""
String fhMetricsVersion = ""
String DOCKER_HUB_ORG = "feedhenry"
String BUILD = ""
String CHANGE_URL = ""

stage('Trust') {
    enforceTrustedApproval()
}

fhBuildNode([labels: ['nodejs6']]) {

    BUILD = env.BUILD_NUMBER
    CHANGE_URL = env.CHANGE_URL

    stage('Install Dependencies') {
        dir('fh-messaging') {
            fhMessagingVersion = getBaseVersionFromPackageJson()
            npmInstall {}
        }
        dir('fh-metrics') {
            fhMetricsVersion = getBaseVersionFromPackageJson()
            npmInstall {}
        }
    }

    stage('Lint') {
        dir('fh-messaging') {
            sh "grunt eslint"
        }
        dir('fh-metrics') {
            sh "grunt eslint"
        }
    }

    withOpenshiftServices(['mongodb32']) {

        stage('Unit Tests') {
            dir('fh-messaging') {
                sh "grunt fh-unit"
            }
            dir('fh-metrics') {
                sh "grunt fh-unit"
            }

        }

        stage('Acceptance Tests') {
            dir('fh-messaging') {
                sh "grunt fh-accept"
            }
            dir('fh-metrics') {
                sh "grunt fh-accept"
            }

        }

        stage('Integration Tests') {
            dir('fh-messaging') {
                sh "npm install -g"
                sh "cp -R config /tmp/fh-messaging-config"
                sh """
                  cat /tmp/fh-messaging-config/dev.json | \
                  jq '.database.host="${env.MONGODB_HOST}"' | \
                  jq '.metrics.database.host="${env.MONGODB_HOST}"' | \
                  jq '.metrics.metricsDir="/tmp/var/log/feedhenry/fh-messaging/metrics"' | \
                  jq '.configDir="/tmp/fh-messaging-config/"' > \
                  /tmp/fh-messaging-config/conf.json
                """
                sh "cp /tmp/fh-messaging-config/conf.json config/dev.json"
                sh "mkdir -p /tmp/var/log/feedhenry/fh-messaging/metrics"
                sh "grunt fh-integrate"
            }
            dir('fh-metrics') {
                sh "grunt fh-integrate"
            }

        }

    }

    stage('Build') {
        dir('fh-messaging') {
            sh 'grunt fh:dist --only-bundle-deps'
            sh "cp ./dist/fh-*x64.tar.gz docker/"
            stash name: "fh-messaging-dockerdir", includes: "docker/"
        }
        dir('fh-metrics') {
            sh 'grunt fh:dist --only-bundle-deps'
            sh "cp ./dist/fh-*x64.tar.gz docker/"
            stash name: "fh-metrics-dockerdir", includes: "docker/"
        }

        String buildInfoFileName = 'build-info.json'
        dir('dist') {
            buildInfoFileName = writeBuildInfo('fh-messaging', fhMessagingVersion)
            writeBuildInfo('fh-metrics', fhMetricsVersion)
            sh "cp ../fh-messaging/dist/fh-messaging*.tar.gz ."
            sh "cp ../fh-metrics/dist/fh-metrics*.tar.gz ."
        }

        archiveArtifacts "dist/${buildInfoFileName}"


    }

    stage('Platform Update') {
        final Map updateParams = [
                componentName: 'fh-messaging',
                componentVersion: fhMessagingVersion,
                componentBuild: BUILD,
                changeUrl: CHANGE_URL
        ]
        fhOpenshiftTemplatesComponentUpdate(updateParams)
        fhCoreOpenshiftTemplatesComponentUpdate(updateParams)

        updateParams.componentName = 'fh-metrics'
        updateParams.componentVersion = fhMetricsVersion

        fhOpenshiftTemplatesComponentUpdate(updateParams)
        fhCoreOpenshiftTemplatesComponentUpdate(updateParams)
    }


    stage('Build Image') {
        dir('fh-messaging') {
            dockerBuildNodeComponent('fh-messaging', DOCKER_HUB_ORG)
        }

        dir('fh-metrics') {
            dockerBuildNodeComponent('fh-metrics', DOCKER_HUB_ORG)
        }
    }
}


node('master') {
    stage('Build Image') {
        sh 'mkdir fh-messaging && mkdir fh-metrics'

        dir('fh-messaging') {
            unstash "fh-messaging-dockerdir"

            String tag = "${fhMessagingVersion}-${BUILD}"
            Map params = [
                fromDir: "./docker",
                buildConfigName: "fh-messaging",
                imageRepoSecret: "dockerhub",
                outputImage: "docker.io/${DOCKER_HUB_ORG}/fh-messaging:${tag}"
            ]

            try {
                buildWithDockerStrategy params
            } finally {
                sh "rm -rf ./docker/"
            }
        }

        dir('fh-metrics') {
            unstash "fh-metrics-dockerdir"

            String tag = "${fhMetricsVersion}-${BUILD}"
            Map params = [
                fromDir: "./docker",
                buildConfigName: "fh-metrics",
                imageRepoSecret: "dockerhub",
                outputImage: "docker.io/${DOCKER_HUB_ORG}/fh-metrics:${tag}"
            ]

            try {
                buildWithDockerStrategy params
            } finally {
                sh "rm -rf ./docker/"
            }
        }
    }
}
