import logging
import re


class RedactCredentials(logging.Filter):
    @staticmethod
    def redact(message):
        if not isinstance(message, str):
            return message
        message = re.sub(r"([?&](?:token|finder_token)=)[^\s&\"]+", r"\1[REDACTED]", message)
        message = re.sub(r"(/conversations/finder/)[^/\s?\"]+", r"\1[REDACTED]", message)
        return message

    def filter(self, record):
        # Uvicorn's AccessFormatter requires the original five-element args tuple.
        record.msg = self.redact(record.msg)
        if isinstance(record.args, tuple):
            record.args = tuple(self.redact(value) for value in record.args)
        elif isinstance(record.args, dict):
            record.args = {key: self.redact(value) for key, value in record.args.items()}
        return True


def configure_logging():
    for name in ("uvicorn.access", "uvicorn.error"):
        logging.getLogger(name).addFilter(RedactCredentials())
