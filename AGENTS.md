# Architecture rules

- Keep staging robots directives in an early hostname-conditional head script, not a static noindex tag, because production and staging share the same HTML artifact.