#!groovy

// https://github.com/feedhenry/fh-pipeline-library
@Library('fh-pipeline-library') _

stage('Trust') {
    enforceTrustedApproval()
}

fhBuildNode([labels: ['nodejs6']]) {

    String fhMessagingVersion = null
    String fhMetricsVersion = null
    final String BUILD = env.BUILD_NUMBER
    final String DOCKER_HUB_ORG = "feedhenry"
    final String CHANGE_URL = env.CHANGE_URL

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
        }
        dir('fh-metrics') {
            sh 'grunt fh:dist --only-bundle-deps'
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
