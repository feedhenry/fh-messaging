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
                cmd = 'fh:dist'
            }
        }
        dir('fh-metrics') {
            gruntCmd {
                cmd = 'fh:dist'
            }
        }
        archiveArtifacts "fh-messaging/dist/${name}*.tar.gz, fh-metrics/dist/${name}*.tar.gz"
    }
}
