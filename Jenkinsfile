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

    stage('Build') {
        dir('fh-messaging') {
            gruntCmd {
                cmd = 'fh:dist --only-bundle-deps'
            }
        }
        dir('fh-metrics') {
            gruntCmd {
                cmd = 'fh:dist --only-bundle-deps'
            }
        }

        def buildInfoFileName = 'build-info.json'
        sh "cp fh-messaging/output/**/VERSION.txt ./fh-messaging-VERSION.txt"
        buildInfoFileName = writeBuildInfo('fh-messaging', readFile("fh-messaging-VERSION.txt").trim())
        sh "cp fh-metrics/output/**/VERSION.txt ./fh-metrics-VERSION.txt"
        buildInfoFileName = writeBuildInfo('fh-metrics', readFile("fh-metrics-VERSION.txt").trim())

        archiveArtifacts "fh-messaging/dist/fh-messaging*.tar.gz, fh-metrics/dist/fh-metrics*.tar.gz, ${buildInfoFileName}"
    }
}
