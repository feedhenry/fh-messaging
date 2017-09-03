FROM centos/nodejs-6-centos7

EXPOSE 8080

USER root

RUN ln -sf /usr/share/zoneinfo/UTC /etc/localtime && \
    mkdir -p config && \
    chown -R default:root ./

USER default

# Extract app to work dir and copy conf
COPY fh-*.tar.gz ./
RUN tar -xf fh-*.tar.gz --strip 1 && \
            rm fh-*.tar.gz && \
            mv conf-docker.json config/conf.json && \
            chmod -R ug+rw ./

RUN cp lib/shell/processone.sh bin/fh-msg-process \
    && cp bin/fh_metrics_cli.js bin/fh-metrics-cli

CMD ["bash", "-c", "node ./bin/fhmsgsrv.js ./config/conf.json --master-only"]
