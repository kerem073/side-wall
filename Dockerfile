# https://docs.docker.com/guides/golang/build-images/
FROM golang:1.23

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o /side_wall

ENV DB_NAME=sidewall DB_PASS=lordofthegame666

EXPOSE 3000

CMD ["/side_wall"]
