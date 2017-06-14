//https://github.com/feedhenry/fh-pipeline-library

fhBuildNode {
    stage('Install Dependencies') {
        dir('fh-messaging') {
            npmInstall {}
        }
        dir('fh-metrics') {
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

    withOpenshiftServices(['mongodb']) {
        
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

        def buildInfoFileName = 'build-info.json'
        sh "cp fh-messaging/output/**/VERSION.txt ./fh-messaging-VERSION.txt"
        buildInfoFileName = writeBuildInfo('fh-messaging', readFile("fh-messaging-VERSION.txt").trim())
        sh "cp fh-metrics/output/**/VERSION.txt ./fh-metrics-VERSION.txt"
        buildInfoFileName = writeBuildInfo('fh-metrics', readFile("fh-metrics-VERSION.txt").trim())

        archiveArtifacts "fh-messaging/dist/fh-messaging*.tar.gz, fh-metrics/dist/fh-metrics*.tar.gz, ${buildInfoFileName}"
    }
    
}
