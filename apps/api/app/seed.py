from .models import Review, ReviewQuestion


def demo_review() -> Review:
    questions = [
        ReviewQuestion(original_row=1, question="Is sensitive customer storage inaccessible from the public internet?"),
        ReviewQuestion(original_row=2, question="Are internal production services inaccessible without authentication?"),
        ReviewQuestion(original_row=3, question="Are administrative interfaces restricted from untrusted networks?"),
        ReviewQuestion(original_row=4, question="Do all employees complete annual phishing training?"),
    ]
    return Review(id="review-acme", workspace_id="workspace-demo", name="Acme Security Review", questions=questions)

